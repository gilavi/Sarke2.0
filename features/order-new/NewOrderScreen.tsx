// NewOrderScreen.tsx - orchestrator for the order wizard.
// All step renderers, types, validation, and styles live in sibling files.

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { invalidateRecordLists } from '../../lib/apiHooks';
import {
  buildAlcoholControlOrderHtml,
  buildCraneOperatorOrderHtml,
  buildCraneTechnicalOrderHtml,
  buildFireSafetyOrderEnterpriseHtml,
  buildFireSafetyOrderHtml,
  buildLaborSafetyOrderHtml,
} from '../../lib/orderPdf';
import { storageApi, projectsApi } from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { usePhotoPicker } from '../../hooks/usePhotoPicker';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { useScrollToError } from '../../hooks/useScrollToError';

import type {
  AlcoholControlOrderFormData,
  CraneOperatorOrderFormData,
  CraneTechnicalOrderFormData,
  FireSafetyOrderEnterpriseFormData,
  FireSafetyOrderFormData,
  LaborSafetyOrderFormData,
  Project,
} from '../../types/models';
import { ORDER_DOCUMENT_TYPE_LABEL } from '../../types/models';

import {
  INITIAL_FORM,
  buildFormData,
  canAdvanceStep,
  docSlug,
  getTotalSteps,
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
import { Step3LaborSafety } from './Step3LaborSafety';
import { Step3AlcoholControl } from './Step3AlcoholControl';
import { Step3FireSafety } from './Step3FireSafety';
import { Step3FireSafetyEnterprise } from './Step3FireSafetyEnterprise';
import { Step3CraneOperator } from './Step3CraneOperator';
import { Step4CraneSpecs } from './Step4CraneSpecs';
import { Step4Summary } from './Step4Summary';
import { StepSignaturesFireSafety } from './StepSignaturesFireSafety';
import { StepSignaturesCrane } from './StepSignaturesCrane';

import type { OrderDocumentType } from '../../types/models';

function buildHtml(
  docType: OrderDocumentType | null,
  form: CombinedForm,
  projectName: string,
): string {
  const fd = buildFormData(form, docType);
  if (docType === 'alcohol_control') {
    return buildAlcoholControlOrderHtml({ formData: fd as AlcoholControlOrderFormData, projectName });
  }
  if (docType === 'fire_safety_order') {
    return buildFireSafetyOrderHtml({ formData: fd as FireSafetyOrderFormData, projectName });
  }
  if (docType === 'fire_safety_order_enterprise') {
    return buildFireSafetyOrderEnterpriseHtml({ formData: fd as FireSafetyOrderEnterpriseFormData, projectName });
  }
  if (docType === 'crane_operator_order') {
    return buildCraneOperatorOrderHtml({ formData: fd as CraneOperatorOrderFormData, projectName });
  }
  if (docType === 'crane_technical_order') {
    return buildCraneTechnicalOrderHtml({ formData: fd as CraneTechnicalOrderFormData, projectName });
  }
  return buildLaborSafetyOrderHtml({ formData: fd as LaborSafetyOrderFormData, projectName });
}

export default function NewOrderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { t } = useTranslation();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

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
    projectsApi.getById(projectId).then(p => {
      if (!p) return;
      setProject(p);
      setForm(f => ({
        ...f,
        companyName: p.company_name || p.name,
        legalAddress: p.address ?? '',
        facilityName: p.company_name || p.name,
        objectName: p.name,
        objectAddress: p.address ?? '',
      }));
    }).catch(() => null);
  }, [projectId]);

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
      await ordersApi.create({
        projectId,
        documentType: docType,
        formData: buildFormData(form, docType),
        status: 'draft',
      });
      toast.success(t('orders.orderSaved'));
      router.back();
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

    // Validate signatures for types that require them
    if (isFireSafetyVariant(docType) && (!form.directorSignature || !form.appointedSignature)) {
      toast.error(t('orders.bothSignaturesRequired'));
      return;
    }
    if (isCraneVariant(docType) && (!form.directorSignature || !form.operatorSignature)) {
      toast.error(t('orders.bothSignaturesRequired'));
      return;
    }

    setSaving(true);
    let savedId = '';
    try {
      const saved = await ordersApi.create({
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

      const orderAuthor =
        docType === 'alcohol_control' ? form.responsiblePersonName :
        isFireSafetyVariant(docType) ? form.appointedName :
        isCraneVariant(docType) ? form.craneOperatorName :
        form.specialistName;
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
        {step === 2 && !isCraneOperatorVariant(docType) && (
          <Step2Company form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField} />
        )}
        {step === 2 && isCraneOperatorVariant(docType) && (
          <Step2CraneCompany form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField} />
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
            onPickPhoto={() => handlePickPhoto('craneOperatorCertPhoto')}
            onDeletePhoto={() => handleDeletePhoto('craneOperatorCertPhoto')}
          />
        )}
        {step === 3 && docType === 'crane_technical_order' && (
          <Step3CraneOperator
            form={form} setForm={setForm} s={s} attempted={attempted} registerField={registerField}
            onPickPhoto={() => handlePickPhoto('craneOperatorCertPhoto')}
            onDeletePhoto={() => handleDeletePhoto('craneOperatorCertPhoto')}
            positionLabel={t('orders.qualificationSpecialty')}
            positionField="craneOperatorQualification"
            stepTitle={t('orders.techResponsible')}
          />
        )}
        {step === 4 && isCraneOperatorVariant(docType) && (
          <Step4CraneSpecs
            form={form} setForm={setForm} s={s}
            onPickPhoto={() => handlePickPhoto('craneInspCertPhoto')}
            onDeletePhoto={() => handleDeletePhoto('craneInspCertPhoto')}
          />
        )}
        {/* Summary: step 4 for standard types, step 4 for fire safety, step 5 for crane */}
        {(
          (step === 4 && !isFireSafetyVariant(docType) && !isCraneVariant(docType)) ||
          (step === 4 && isFireSafetyVariant(docType)) ||
          (step === 5 && isCraneVariant(docType))
        ) && (
          <Step4Summary form={form} docType={docType} project={project} s={s} />
        )}
        {/* Combined signature step: step 5 fire safety, step 6 crane */}
        {step === 5 && isFireSafetyVariant(docType) && (
          <StepSignaturesFireSafety form={form} setForm={setForm} theme={theme} s={s} attempted={attempted} registerField={registerField} />
        )}
        {step === 6 && isCraneOperatorVariant(docType) && (
          <StepSignaturesCrane form={form} setForm={setForm} theme={theme} s={s} docType={docType} attempted={attempted} registerField={registerField} />
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
