// NewOrderScreen.tsx - orchestrator for the order wizard.
// All step renderers, types, validation, and styles live in sibling files.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';

import { ArrowRight, FileText } from 'lucide-react-native';
import { FlowHeader } from '../../components/FlowHeader';
import { Button } from '../../components/ui';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { SubscriptionNotice } from '../../components/SubscriptionNotice';

import { useTheme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { hashPdf } from '../../lib/pdfSecurity';
import { generatePdfName } from '../../lib/pdfName';
import { queuePdfUpload, stagePdfForQueue } from '../../lib/pdfUploadQueue';
import { logError } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { ordersApi } from '../../lib/ordersApi';
import { queryClient } from '../../lib/queryClient';
import { invalidateRecordLists, qk } from '../../lib/apiHooks';
import { cachedRead } from '../../lib/cachedRead';
import {
  buildAlcoholControlOrderHtml,
  buildFireSafetyOrderEnterpriseHtml,
} from '../../lib/orderPdf';
import { storageApi, projectsApi } from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { usePhotoPicker } from '../../hooks/usePhotoPicker';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { useScrollToError } from '../../hooks/useScrollToError';

import type {
  AlcoholControlOrderFormData,
  FireSafetyOrderEnterpriseFormData,
  Project,
} from '../../types/models';
import { ORDER_DOCUMENT_TYPE_LABEL } from '../../types/models';

import {
  INITIAL_FORM,
  buildFormData,
  canAdvanceStep,
  docSlug,
  getTotalSteps,
  isActStyleOrder,
  isCraneOperatorVariant,
  isCraneVariant,
  isFireSafetyVariant,
  missingFieldsForStep,
  type CombinedForm,
  type Step,
} from './orderFormSchema';
import { makeStyles } from './styles';
import { Step1DocType } from './Step1DocType';
import { Step2Company } from './Step2Company';
import { Step2CraneCompany } from './Step2CraneCompany';
import { Step2TrainingCompany } from './Step2TrainingCompany';
import { Step3LaborSafety } from './Step3LaborSafety';
import { Step3AlcoholControl } from './Step3AlcoholControl';
import { Step3FireSafety } from './Step3FireSafety';
import { Step3FireSafetyEnterprise } from './Step3FireSafetyEnterprise';
import { Step3CraneOperator } from './Step3CraneOperator';
import { Step3Scaffold } from './Step3Scaffold';
import { Step4CraneCertificate } from './Step4CraneCertificate';
import { StepCraneSerial } from './StepCraneSerial';
import { Step4CraneSpecs } from './Step4CraneSpecs';
import { Step4Summary } from './Step4Summary';
import { StepSignaturesFireSafety } from './StepSignaturesFireSafety';

import type { OrderDocumentType } from '../../types/models';

/**
 * Build the PDF HTML for the two *classic* (in-wizard) order types that finish
 * with a summary + immediate PDF: enterprise fire-safety and alcohol-control.
 * Every act-style type (crane, scaffold, simple fire-safety, labor-safety,
 * training) generates its PDF on the success screen — see `OrderActSuccessView`.
 */
function buildHtml(
  docType: OrderDocumentType | null,
  form: CombinedForm,
  projectName: string,
): string {
  const fd = buildFormData(form, docType);
  if (docType === 'fire_safety_order_enterprise') {
    return buildFireSafetyOrderEnterpriseHtml({ formData: fd as FireSafetyOrderEnterpriseFormData, projectName });
  }
  // alcohol_control — the only other classic type that reaches this path.
  return buildAlcoholControlOrderHtml({ formData: fd as AlcoholControlOrderFormData, projectName });
}

export default function NewOrderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { t } = useTranslation();
  const { projectId, editId } = useLocalSearchParams<{ projectId: string; editId?: string }>();

  const [step, setStep] = useState<Step>(1);
  // Enabled forward/submit button + on-press field errors (see useSubmitGuard).
  const { attempted, guard, reset: resetAttempted } = useSubmitGuard();
  // Scroll the first empty required field into view on a blocked press.
  const { scrollRef, registerField, scrollToFirstError } = useScrollToError();
  const [docType, setDocType] = useState<OrderDocumentType | null>(null);
  const [form, setForm] = useState<CombinedForm>(INITIAL_FORM);
  const [project, setProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const [photoSessionId] = useState(() => Crypto.randomUUID());
  const { pickPhotoWithAnnotation } = usePhotoPicker();

  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const userId = useMemo(() => {
    if (session.state.status !== 'signedIn') return undefined;
    return session.state.session.user.id;
  }, [session.state]);

  useEffect(() => {
    if (!projectId) return;
    cachedRead(qk.projects.byId(projectId), () => projectsApi.getById(projectId)).then(p => {
      if (!p) return;
      setProject(p);
      // Edit mode: keep the saved form values; don't autofill from the project.
      if (editId) return;
      setForm(f => ({
        ...f,
        companyName: p.company_name || p.name,
        legalAddress: p.address ?? '',
        facilityName: p.company_name || p.name,
        objectName: p.name,
        objectAddress: p.address ?? '',
      }));
    }).catch(() => null);
  }, [projectId, editId]);

  // Edit mode: hydrate docType + form from the (reopened) order. buildFormData
  // keeps identical field names, so the stored form_data maps straight back
  // onto CombinedForm.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!editId || hydratedRef.current) return;
    hydratedRef.current = true;
    let mounted = true;
    (async () => {
      try {
        const order = await cachedRead(qk.orders.byId(editId), () => ordersApi.getById(editId));
        if (!order || !mounted) return;
        setDocType(order.documentType);
        setForm(f => ({ ...f, ...(order.formData as Partial<CombinedForm>) }));
      } catch {
        // best-effort: leave the blank form if hydration fails
      }
    })();
    return () => { mounted = false; };
  }, [editId]);

  // Auto-generate order number when a crane order is selected
  useEffect(() => {
    if (isCraneVariant(docType) && form.orderNumber === '') {
      const year = new Date().getFullYear();
      const seq = String(Math.floor(Math.random() * 900) + 100);
      setForm(f => ({ ...f, orderNumber: `KR-${year}/${seq}` }));
    }
  }, [docType]); // eslint-disable-line react-hooks/exhaustive-deps

  // photo handlers (crane_operator_order)
  const handlePickPhoto = useCallback(async (field: 'craneOperatorCertPhoto' | 'craneInspCertPhoto') => {
    const result = await pickPhotoWithAnnotation({ skipAnnotate: true });
    if (!result) return;
    try {
      const uuid = Crypto.randomUUID();
      const subfolder = field === 'craneOperatorCertPhoto' ? 'operator-cert' : 'crane-insp';
      const path = `orders/${photoSessionId}/${subfolder}/${uuid}.jpg`;
      await storageApi.uploadFromUri(STORAGE_BUCKETS.answerPhotos, path, result.uri, 'image/jpeg', 'certificate');
      setForm(f => ({ ...f, [field]: path }));
    } catch {
      toast.error(t('orders.photoUploadFailed'));
    }
  }, [pickPhotoWithAnnotation, photoSessionId, toast, t]);

  const handleDeletePhoto = useCallback(async (field: 'craneOperatorCertPhoto' | 'craneInspCertPhoto') => {
    const path = form[field];
    if (!path) return;
    storageApi.remove(STORAGE_BUCKETS.answerPhotos, path).catch(() => {});
    setForm(f => ({ ...f, [field]: null }));
  }, [form]);

  const isFormDirty = useMemo(() => (
    docType !== null ||
    form.orderNumber.trim().length > 0 ||
    form.city.trim().length > 0 ||
    form.directorName.trim().length > 0
  ), [form, docType]);

  const goBack = () => {
    if (step === 1) router.back();
    else setStep(prev => (prev - 1) as Step);
  };

  const canAdvance = useMemo(
    () => canAdvanceStep(step, docType, form),
    [step, form, docType],
  );

  const goNext = () => {
    setStep(prev => (prev + 1) as Step);
  };

  // Clear the error reveal whenever the step changes.
  useEffect(() => { resetAttempted(); }, [step, resetAttempted]);

  // ── save draft ──────────────────────────────────────────────────────────────
  const saveDraft = async () => {
    if (!projectId || !docType) return;
    setSaving(true);
    try {
      if (editId) {
        await ordersApi.update(editId, {
          documentType: docType,
          formData: buildFormData(form, docType),
          status: 'draft',
        });
      } else {
        await ordersApi.create({
          projectId,
          documentType: docType,
          formData: buildFormData(form, docType),
          status: 'draft',
        });
      }
      invalidateRecordLists(queryClient);
      toast.success(t('orders.orderSaved'));
      router.back();
    } catch (e) {
      toast.error(friendlyError(e, t('orders.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  // ── act-style orders (crane, scaffold): save + go to the success screen ───────
  // No PDF here — it's generated on the success screen after signature graphs
  // are added.
  const saveActOrderAndFinish = async () => {
    if (!projectId || !docType) {
      toast.error(t('orders.projectNotFound'));
      return;
    }
    setSaving(true);
    try {
      const saved = editId
        ? await ordersApi.update(editId, {
            documentType: docType,
            formData: buildFormData(form, docType),
            status: 'completed',
          })
        : await ordersApi.create({
            projectId,
            documentType: docType,
            formData: buildFormData(form, docType),
            status: 'completed',
          });
      invalidateRecordLists(queryClient);
      router.replace(`/orders/${saved.id}/success` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('orders.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  // ── generate PDF ────────────────────────────────────────────────────────────
  const saveAndGeneratePdf = async () => {
    if (!projectId || !project || !docType) {
      toast.error(t('orders.projectNotFound'));
      return;
    }
    if (pdfUsage?.isLocked) { setLimitNoticeVisible(true); return; }

    // Fire-safety still captures digital signatures; crane orders use blank
    // hand-sign graphs on the printed PDF, so nothing to validate there.
    if (isFireSafetyVariant(docType) && (!form.directorSignature || !form.appointedSignature)) {
      toast.error(t('orders.bothSignaturesRequired'));
      return;
    }

    setSaving(true);
    let savedId = '';
    try {
      const saved = editId
        ? await ordersApi.update(editId, {
            documentType: docType,
            formData: buildFormData(form, docType),
            status: 'completed',
          })
        : await ordersApi.create({
            projectId,
            documentType: docType,
            formData: buildFormData(form, docType),
            status: 'completed',
          });
      savedId = saved.id;
      invalidateRecordLists(queryClient);

      const projectName = project.company_name || project.name;
      const html = buildHtml(docType, form, projectName);
      const pdfName = generatePdfName(projectName, docSlug(docType), new Date(form.orderDate), savedId);
      const pdfPath = `orders/${pdfName}`;

      // Only the two classic types reach this path; enterprise fire-safety names
      // the appointed person, alcohol-control names the responsible person.
      const orderAuthor =
        docType === 'alcohol_control' ? form.responsiblePersonName : form.appointedName;
      const orderTitle = docType ? ORDER_DOCUMENT_TYPE_LABEL[docType] : t('orders.orderTitle');
      const localUri = await generateAndSharePdf(html, pdfName, true, userId, {
        title: orderTitle,
        author: orderAuthor || undefined,
        documentId: savedId,
        subject: 'შრომის უსაფრთხოების ბრძანება',
      });
      const pdfHash = localUri ? await hashPdf(localUri).catch(() => undefined) : undefined;
      invalidatePdfUsage();

      router.replace(`/orders/${savedId}/success` as any);

      if (localUri) {
        (async () => {
          try {
            await storageApi.uploadFromUri(STORAGE_BUCKETS.pdfs, pdfPath, localUri, 'application/pdf');
            await ordersApi.update(savedId, { pdfUrl: pdfPath, ...(pdfHash ? { pdfHash } : {}) });
            FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
          } catch (e) {
            logError(e, 'orderNew.backgroundUpload');
            const stagedUri = await stagePdfForQueue(localUri, pdfName);
            await queuePdfUpload({
              localUri: stagedUri,
              bucket: STORAGE_BUCKETS.pdfs,
              path: pdfPath,
              contentType: 'application/pdf',
              dbOp: { kind: 'none' },
            });
            toast.info(t('orders.pdfSavedLocally'));
          }
        })();
      }
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setLimitNoticeVisible(true); return; }
      toast.error(friendlyError(e, t('orders.pdfGenerateFailed')));
      if (savedId) router.replace(`/orders/${savedId}/success` as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlowHeader
        flowTitle={t('orders.orderTitle')}
        project={project}
        step={step}
        totalSteps={getTotalSteps(docType)}
        onBack={goBack}
        confirmExit={step === 1 && isFormDirty}
      />

      <KeyboardSafeArea headerHeight={44} contentStyle={{ padding: 16 }} scrollRef={scrollRef}>
        {step === 1 && (
          <Step1DocType docType={docType} setDocType={setDocType} theme={theme} s={s} attempted={attempted} />
        )}
        {step === 2 && !isCraneOperatorVariant(docType) && docType !== 'training_schedule_order' && (
          <Step2Company form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField} />
        )}
        {step === 2 && isCraneOperatorVariant(docType) && (
          <Step2CraneCompany form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField} />
        )}
        {step === 2 && docType === 'training_schedule_order' && (
          <Step2TrainingCompany form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField} />
        )}
        {step === 3 && docType === 'labor_safety_specialist' && (
          <Step3LaborSafety form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField} />
        )}
        {step === 3 && docType === 'alcohol_control' && (
          <Step3AlcoholControl form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField} />
        )}
        {step === 3 && docType === 'fire_safety_order' && (
          <Step3FireSafety form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField} />
        )}
        {step === 3 && docType === 'fire_safety_order_enterprise' && (
          <Step3FireSafetyEnterprise form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField} />
        )}
        {step === 3 && docType === 'crane_operator_order' && (
          <Step3CraneOperator
            form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField}
          />
        )}
        {step === 3 && docType === 'crane_technical_order' && (
          <Step3CraneOperator
            form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField}
            positionLabel={t('orders.qualificationSpecialty')}
            positionField="craneOperatorQualification"
            stepTitle={t('orders.techResponsible')}
          />
        )}
        {step === 3 && docType === 'scaffold_supervision_order' && (
          <Step3Scaffold form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField} />
        )}
        {step === 4 && isCraneVariant(docType) && (
          <Step4CraneCertificate
            form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField}
            onPickPhoto={() => handlePickPhoto('craneOperatorCertPhoto')}
            onDeletePhoto={() => handleDeletePhoto('craneOperatorCertPhoto')}
          />
        )}
        {step === 5 && isCraneVariant(docType) && (
          <StepCraneSerial form={form} setForm={setForm} s={s} />
        )}
        {step === 6 && isCraneVariant(docType) && (
          <Step4CraneSpecs
            form={form} setForm={setForm} s={s}
            onPickPhoto={() => handlePickPhoto('craneInspCertPhoto')}
            onDeletePhoto={() => handleDeletePhoto('craneInspCertPhoto')}
          />
        )}
        {/* Summary + in-wizard signatures: classic types only (labor safety,
            alcohol, enterprise fire safety). Act-style types (crane, scaffold,
            simple fire safety) finish on the success screen where signature
            graphs are added and the PDF is generated. */}
        {step === 4 && (
          docType === 'alcohol_control' ||
          docType === 'fire_safety_order_enterprise'
        ) && (
          <Step4Summary form={form} docType={docType} project={project} s={s} />
        )}
        {step === 5 && docType === 'fire_safety_order_enterprise' && (
          <StepSignaturesFireSafety form={form} setForm={setForm} theme={theme} s={s} attempted={attempted} registerField={registerField} />
        )}
      </KeyboardSafeArea>

      {/* Footer rides above the keyboard so action buttons stay reachable while
          typing in any step's fields. Matches reports/new + briefings/new. */}
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          {step < getTotalSteps(docType) ? (
            <Button
              title={t('orders.nextButton')}
              rightIcon={ArrowRight}
              onPress={() => guard(canAdvance, goNext, () => scrollToFirstError(missingFieldsForStep(step, docType, form)))}
              style={{ width: '100%' }}
            />
          ) : isActStyleOrder(docType) ? (
            // Act-style (crane, scaffold): finish → save the record and go to the
            // success screen, where signature graphs are added and the PDF shared.
            <View style={{ gap: 10 }}>
              <Button
                title={t('orders.finishButton')}
                rightIcon={ArrowRight}
                loading={saving}
                onPress={() => guard(canAdvance, saveActOrderAndFinish, () => scrollToFirstError(missingFieldsForStep(step, docType, form)))}
                style={{ width: '100%' }}
              />
              <Button
                title={t('orders.saveWithoutPdf')}
                variant="link"
                disabled={saving}
                onPress={saveDraft}
                style={{ width: '100%' }}
              />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Button
                title={pdfUsage?.isLocked ? `🔒 ${t('orders.generatePdf')}` : t('orders.generatePdf')}
                leftIcon={FileText}
                loading={saving}
                onPress={() => guard(canAdvance, saveAndGeneratePdf, () => scrollToFirstError(missingFieldsForStep(step, docType, form)))}
                style={{ width: '100%' }}
              />
              <Button
                title={t('orders.saveWithoutPdf')}
                variant="link"
                disabled={saving}
                onPress={saveDraft}
                style={{ width: '100%' }}
              />
            </View>
          )}
        </View>
      </KeyboardStickyView>

      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
    </View>
  );
}
