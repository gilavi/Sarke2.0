import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { A11yText as Text } from '../../components/primitives/A11yText';
import { FlowHeader } from '../../components/FlowHeader';
import { DateTimeField } from '../../components/DateTimeField';
import { Button } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { PaywallModal } from '../../components/PaywallModal';

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
import { buildLaborSafetyOrderHtml, buildAlcoholControlOrderHtml, buildFireSafetyOrderHtml, buildFireSafetyOrderEnterpriseHtml } from '../../lib/orderPdf';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import { storageApi, projectsApi } from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

import type {
  OrderDocumentType,
  LaborSafetyOrderFormData,
  AlcoholControlOrderFormData,
  FireSafetyOrderFormData,
  FireSafetyOrderEnterpriseFormData,
  Project,
} from '../../types/models';
import { ORDER_DOCUMENT_TYPE_LABEL } from '../../types/models';

// ─── types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6;

function getTotalSteps(docType: OrderDocumentType | null): number {
  if (docType === 'fire_safety_order' || docType === 'fire_safety_order_enterprise') return 6;
  return 4;
}

function isFireSafetyVariant(docType: OrderDocumentType | null): boolean {
  return docType === 'fire_safety_order' || docType === 'fire_safety_order_enterprise';
}

// Combined form — all fields across all document types; unused ones stay ''
interface CombinedForm {
  orderNumber: string;
  city: string;
  orderDate: string;
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  facilityName: string;
  // labor_safety_specialist
  specialistName: string;
  specialistPersonalId: string;
  certificateNumber: string;
  certificateDate: string;
  // alcohol_control
  responsiblePersonName: string;
  responsiblePersonPosition: string;
  responsiblePersonPersonalId: string;
  // fire_safety_order
  appointedName: string;
  appointedPhone: string;
  objectName: string;
  objectAddress: string;
  // fire_safety_order_enterprise extras
  appointedPosition: string;
  appointedIdNumber: string;
  directorSignature: string | null;
  directorSignedAt: string | null;
  appointedSignature: string | null;
  appointedSignedAt: string | null;
}

const INITIAL_FORM: CombinedForm = {
  orderNumber: '',
  city: '',
  orderDate: new Date().toISOString(),
  companyName: '',
  identificationCode: '',
  legalAddress: '',
  directorName: '',
  facilityName: '',
  specialistName: '',
  specialistPersonalId: '',
  certificateNumber: '',
  certificateDate: new Date().toISOString(),
  responsiblePersonName: '',
  responsiblePersonPosition: '',
  responsiblePersonPersonalId: '',
  appointedName: '',
  appointedPhone: '',
  objectName: '',
  objectAddress: '',
  appointedPosition: '',
  appointedIdNumber: '',
  directorSignature: null,
  directorSignedAt: null,
  appointedSignature: null,
  appointedSignedAt: null,
};

const DOC_TYPES: { type: OrderDocumentType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'labor_safety_specialist',      icon: 'shield-checkmark-outline' },
  { type: 'alcohol_control',              icon: 'ban-outline' },
  { type: 'fire_safety_order',            icon: 'flame-outline' },
  { type: 'fire_safety_order_enterprise', icon: 'flame-outline' },
];

// ─── main component ───────────────────────────────────────────────────────────

export default function NewOrderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const [step, setStep] = useState<Step>(1);
  const [docType, setDocType] = useState<OrderDocumentType | null>(null);
  const [form, setForm] = useState<CombinedForm>(INITIAL_FORM);
  const [project, setProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

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

  // ── navigation ──────────────────────────────────────────────────────────────

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

  const canAdvance = useMemo((): boolean => {
    if (step === 1) return docType !== null;
    if (step === 2) return (
      form.orderNumber.trim().length > 0 &&
      form.city.trim().length > 0 &&
      form.companyName.trim().length > 0 &&
      form.directorName.trim().length > 0
    );
    if (step === 3) {
      if (docType === 'labor_safety_specialist') {
        return (
          form.facilityName.trim().length > 0 &&
          form.specialistName.trim().length > 0 &&
          form.specialistPersonalId.trim().length === 11 &&
          form.certificateNumber.trim().length > 0
        );
      }
      if (docType === 'alcohol_control') {
        return (
          form.facilityName.trim().length > 0 &&
          form.responsiblePersonName.trim().length > 0 &&
          form.responsiblePersonPosition.trim().length > 0 &&
          form.responsiblePersonPersonalId.trim().length === 11
        );
      }
      if (docType === 'fire_safety_order') {
        return (
          form.appointedName.trim().length > 0 &&
          form.appointedPhone.trim().length > 0 &&
          form.objectName.trim().length > 0
        );
      }
      if (docType === 'fire_safety_order_enterprise') {
        return (
          form.appointedName.trim().length > 0 &&
          form.appointedPhone.trim().length > 0 &&
          form.appointedPosition.trim().length > 0 &&
          form.appointedIdNumber.trim().length > 0 &&
          form.objectName.trim().length > 0
        );
      }
    }
    if (step === 4 && isFireSafetyVariant(docType)) return !!form.directorSignature;
    if (step === 5 && isFireSafetyVariant(docType)) return !!form.appointedSignature;
    return true;
  }, [step, form, docType]);

  const goNext = () => {
    if (!canAdvance) return;
    setStep(prev => (prev + 1) as Step);
  };

  // ── build typed form data for the chosen document type ──────────────────────

  const buildFormData = (): LaborSafetyOrderFormData | AlcoholControlOrderFormData | FireSafetyOrderFormData | FireSafetyOrderEnterpriseFormData => {
    const base = {
      orderNumber: form.orderNumber,
      city: form.city,
      orderDate: form.orderDate,
      companyName: form.companyName,
      identificationCode: form.identificationCode,
      legalAddress: form.legalAddress,
      directorName: form.directorName,
      facilityName: form.facilityName,
    };
    if (docType === 'alcohol_control') {
      return {
        ...base,
        responsiblePersonName: form.responsiblePersonName,
        responsiblePersonPosition: form.responsiblePersonPosition,
        responsiblePersonPersonalId: form.responsiblePersonPersonalId,
      };
    }
    if (docType === 'fire_safety_order') {
      return {
        orderNumber: form.orderNumber,
        city: form.city,
        orderDate: form.orderDate,
        companyName: form.companyName,
        identificationCode: form.identificationCode,
        legalAddress: form.legalAddress,
        directorName: form.directorName,
        appointedName: form.appointedName,
        appointedPhone: form.appointedPhone,
        objectName: form.objectName,
        objectAddress: form.objectAddress,
        directorSignature: form.directorSignature,
        directorSignedAt: form.directorSignedAt,
        appointedSignature: form.appointedSignature,
        appointedSignedAt: form.appointedSignedAt,
      };
    }
    if (docType === 'fire_safety_order_enterprise') {
      return {
        orderNumber: form.orderNumber,
        city: form.city,
        orderDate: form.orderDate,
        companyName: form.companyName,
        identificationCode: form.identificationCode,
        legalAddress: form.legalAddress,
        directorName: form.directorName,
        appointedName: form.appointedName,
        appointedPhone: form.appointedPhone,
        appointedPosition: form.appointedPosition,
        appointedIdNumber: form.appointedIdNumber,
        objectName: form.objectName,
        objectAddress: form.objectAddress,
        directorSignature: form.directorSignature,
        directorSignedAt: form.directorSignedAt,
        appointedSignature: form.appointedSignature,
        appointedSignedAt: form.appointedSignedAt,
      };
    }
    return {
      ...base,
      specialistName: form.specialistName,
      specialistPersonalId: form.specialistPersonalId,
      certificateNumber: form.certificateNumber,
      certificateDate: form.certificateDate,
    };
  };

  const buildHtml = (projectName: string): string => {
    const fd = buildFormData();
    if (docType === 'alcohol_control') {
      return buildAlcoholControlOrderHtml({ formData: fd as AlcoholControlOrderFormData, projectName });
    }
    if (docType === 'fire_safety_order') {
      return buildFireSafetyOrderHtml({ formData: fd as FireSafetyOrderFormData, projectName });
    }
    if (docType === 'fire_safety_order_enterprise') {
      return buildFireSafetyOrderEnterpriseHtml({ formData: fd as FireSafetyOrderEnterpriseFormData, projectName });
    }
    return buildLaborSafetyOrderHtml({ formData: fd as LaborSafetyOrderFormData, projectName });
  };

  const docSlug = () => {
    if (docType === 'alcohol_control') return 'brdzaneba_alkoholi';
    if (docType === 'fire_safety_order') return 'brdzaneba_saxandzro';
    if (docType === 'fire_safety_order_enterprise') return 'brdzaneba_saxandzro_sawarmoo';
    return 'brdzaneba_shus_danishvna';
  };

  // ── save draft ──────────────────────────────────────────────────────────────

  const saveDraft = async () => {
    if (!projectId || !docType) return;
    setSaving(true);
    try {
      await ordersApi.create({
        projectId,
        documentType: docType,
        formData: buildFormData(),
        status: 'draft',
      });
      toast.success('ბრძანება შენახულია');
      router.back();
    } catch (e) {
      toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
    } finally {
      setSaving(false);
    }
  };

  // ── generate PDF ────────────────────────────────────────────────────────────

  const saveAndGeneratePdf = async () => {
    if (!projectId || !project || !docType) {
      toast.error('პროექტი ვერ მოიძებნა');
      return;
    }
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }

    setSaving(true);
    let savedId = '';
    try {
      const saved = await ordersApi.create({
        projectId,
        documentType: docType,
        formData: buildFormData(),
        status: 'completed',
      });
      savedId = saved.id;

      const projectName = project.company_name || project.name;
      const html = buildHtml(projectName);
      const pdfName = generatePdfName(projectName, docSlug(), new Date(form.orderDate), savedId);
      const pdfPath = `orders/${pdfName}`;

      const orderAuthor =
        docType === 'alcohol_control' ? form.responsiblePersonName :
        isFireSafetyVariant(docType) ? form.appointedName :
        form.specialistName;
      const orderTitle =
        docType === 'alcohol_control' ? 'ალკოჰოლური და ნარკოტიკული თრობის კონტროლი' :
        docType === 'fire_safety_order' ? 'სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა' :
        docType === 'fire_safety_order_enterprise' ? 'საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა' :
        'შრომის უსაფრთხოების სპეციალისტის დანიშვნა';
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
            toast.info('PDF შენახულია ლოკალურად; სინქრონიზაცია მოხდება ქსელზე დაბრუნებისას');
          }
        })();
      }
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      toast.error(friendlyError(e, 'PDF-ის შექმნა ვერ მოხერხდა'));
      if (savedId) router.replace(`/orders/${savedId}/success` as any);
    } finally {
      setSaving(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlowHeader
        flowTitle="ბრძანება"
        project={project}
        step={step}
        totalSteps={getTotalSteps(docType)}
        onBack={goBack}
        confirmExit={step === 1 && isFormDirty}
      />

      <KeyboardSafeArea headerHeight={44} contentStyle={{ padding: 16 }}>
        {step === 1 && (
          <Step1DocType docType={docType} setDocType={setDocType} theme={theme} s={s} />
        )}
        {step === 2 && <Step2Company form={form} setForm={setForm} theme={theme} s={s} />}
        {step === 3 && docType === 'labor_safety_specialist' && (
          <Step3LaborSafety form={form} setForm={setForm} theme={theme} s={s} />
        )}
        {step === 3 && docType === 'alcohol_control' && (
          <Step3AlcoholControl form={form} setForm={setForm} theme={theme} s={s} />
        )}
        {step === 3 && docType === 'fire_safety_order' && (
          <Step3FireSafety form={form} setForm={setForm} theme={theme} s={s} />
        )}
        {step === 3 && docType === 'fire_safety_order_enterprise' && (
          <Step3FireSafetyEnterprise form={form} setForm={setForm} theme={theme} s={s} />
        )}
        {step === 4 && isFireSafetyVariant(docType) && (
          <StepSignDirector form={form} setForm={setForm} theme={theme} s={s} />
        )}
        {step === 5 && isFireSafetyVariant(docType) && (
          <StepSignAppointed form={form} setForm={setForm} theme={theme} s={s} />
        )}
        {/* Summary: step 4 for standard types, step 6 for fire safety variants */}
        {((step === 4 && !isFireSafetyVariant(docType)) || step === 6) && (
          <Step4Summary form={form} docType={docType} project={project} theme={theme} s={s} />
        )}
      </KeyboardSafeArea>

      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        {step < getTotalSteps(docType) ? (
          <Button
            title="შემდეგი"
            rightIcon="arrow-forward"
            onPress={goNext}
            disabled={!canAdvance}
            style={{ width: '100%' }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            <Button
              title={pdfUsage?.isLocked ? '🔒 PDF გენერირება' : 'PDF გენერირება'}
              leftIcon="document-text"
              loading={saving}
              onPress={saveAndGeneratePdf}
              style={{ width: '100%' }}
            />
            <Button
              title="შენახვა PDF-ის გარეშე"
              variant="link"
              disabled={saving}
              onPress={saveDraft}
              style={{ width: '100%' }}
            />
          </View>
        )}
      </View>

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
    </View>
  );
}

// ─── Step 1 — document type selection ─────────────────────────────────────────

function Step1DocType({
  docType, setDocType, theme, s,
}: {
  docType: OrderDocumentType | null;
  setDocType: (t: OrderDocumentType) => void;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>ბრძანების ტიპი</Text>
      {DOC_TYPES.map(({ type, icon }) => {
        const selected = docType === type;
        return (
          <Pressable
            key={type}
            onPress={() => setDocType(type)}
            style={[s.typeCard, selected && s.typeCardSelected]}
          >
            <View style={[s.typeIcon, selected && s.typeIconSelected]}>
              <Ionicons
                name={icon}
                size={22}
                color={selected ? theme.colors.white : theme.colors.accent}
              />
            </View>
            <Text style={[s.typeLabel, selected && { color: theme.colors.accent, fontWeight: '700' }]}>
              {ORDER_DOCUMENT_TYPE_LABEL[type]}
            </Text>
            {selected && (
              <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Step 2 — company info (shared) ───────────────────────────────────────────

function Step2Company({
  form, setForm, theme: _theme, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>ბრძანების ინფო</Text>

      <FloatingLabelInput
        label="ბრძანების ნომერი (მაგ. 05/2024)"
        required
        value={form.orderNumber}
        onChangeText={v => setForm(f => ({ ...f, orderNumber: v }))}
      />

      <FloatingLabelInput
        label="ქალაქი"
        required
        value={form.city}
        onChangeText={v => setForm(f => ({ ...f, city: v }))}
      />

      <DateTimeField
        label="ბრძანების თარიღი"
        value={new Date(form.orderDate)}
        onChange={d => setForm(f => ({ ...f, orderDate: d.toISOString() }))}
        mode="date"
      />

      <Text style={s.sectionLabel}>კომპანიის ინფო</Text>

      <FloatingLabelInput
        label="კომპანიის დასახელება (შპს / სს ...)"
        required
        value={form.companyName}
        onChangeText={v => setForm(f => ({ ...f, companyName: v }))}
      />

      <FloatingLabelInput
        label="საიდენტიფიკაციო კოდი"
        value={form.identificationCode}
        onChangeText={v => setForm(f => ({ ...f, identificationCode: v }))}
        keyboardType="numeric"
        maxLength={9}
      />

      <FloatingLabelInput
        label="იურიდიული მისამართი"
        value={form.legalAddress}
        onChangeText={v => setForm(f => ({ ...f, legalAddress: v }))}
      />

      <FloatingLabelInput
        label="დირექტორი (სახელი გვარი)"
        required
        value={form.directorName}
        onChangeText={v => setForm(f => ({ ...f, directorName: v }))}
      />
    </View>
  );
}

// ─── Step 3a — labor safety specialist ───────────────────────────────────────

function Step3LaborSafety({
  form, setForm, theme: _theme, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>სპეციალისტი</Text>

      <FloatingLabelInput
        label="ობიექტის სახელი და მისამართი"
        required
        value={form.facilityName}
        onChangeText={v => setForm(f => ({ ...f, facilityName: v }))}
        multiline
        numberOfLines={2}
      />

      <FloatingLabelInput
        label="სპეციალისტი (სახელი გვარი)"
        required
        value={form.specialistName}
        onChangeText={v => setForm(f => ({ ...f, specialistName: v }))}
      />

      <FloatingLabelInput
        label="პირადი ნომერი (11 ციფრი)"
        required
        value={form.specialistPersonalId}
        onChangeText={v => setForm(f => ({ ...f, specialistPersonalId: v }))}
        keyboardType="numeric"
        maxLength={11}
      />

      <FloatingLabelInput
        label="სერტიფიკატის ნომერი"
        required
        value={form.certificateNumber}
        onChangeText={v => setForm(f => ({ ...f, certificateNumber: v }))}
      />

      <DateTimeField
        label="სერტიფიკატის გაცემის თარიღი"
        value={new Date(form.certificateDate)}
        onChange={d => setForm(f => ({ ...f, certificateDate: d.toISOString() }))}
        mode="date"
      />
    </View>
  );
}

// ─── Step 3b — alcohol control ────────────────────────────────────────────────

function Step3AlcoholControl({
  form, setForm, theme: _theme, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>პასუხისმგებელი პირი</Text>

      <FloatingLabelInput
        label="ობიექტის სახელი და მისამართი"
        required
        value={form.facilityName}
        onChangeText={v => setForm(f => ({ ...f, facilityName: v }))}
        multiline
        numberOfLines={2}
      />

      <FloatingLabelInput
        label="სახელი, გვარი"
        required
        value={form.responsiblePersonName}
        onChangeText={v => setForm(f => ({ ...f, responsiblePersonName: v }))}
      />

      <FloatingLabelInput
        label="თანამდებობა"
        required
        value={form.responsiblePersonPosition}
        onChangeText={v => setForm(f => ({ ...f, responsiblePersonPosition: v }))}
      />

      <FloatingLabelInput
        label="პირადი ნომერი (11 ციფრი)"
        required
        value={form.responsiblePersonPersonalId}
        onChangeText={v => setForm(f => ({ ...f, responsiblePersonPersonalId: v }))}
        keyboardType="numeric"
        maxLength={11}
      />
    </View>
  );
}

// ─── Step 4 — summary ─────────────────────────────────────────────────────────

function Step4Summary({
  form, docType, project, theme: _theme, s,
}: {
  form: CombinedForm;
  docType: OrderDocumentType | null;
  project: Project | null;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  const orderDate = new Date(form.orderDate).toLocaleDateString('ka-GE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>შეჯამება</Text>

      <View style={s.summaryCard}>
        {docType ? (
          <Text style={[s.summaryLabel, { width: 'auto', marginBottom: 4, fontWeight: '700' }]}>
            {ORDER_DOCUMENT_TYPE_LABEL[docType]}
          </Text>
        ) : null}
        <SummaryRow label="ბრძანება №" value={form.orderNumber || '—'} s={s} />
        <SummaryRow label="ქალაქი" value={form.city || '—'} s={s} />
        <SummaryRow label="თარიღი" value={orderDate} s={s} />
        <SummaryRow label="კომპანია" value={form.companyName || '—'} s={s} />
        {form.identificationCode ? (
          <SummaryRow label="კოდი" value={form.identificationCode} s={s} />
        ) : null}
        {form.legalAddress ? (
          <SummaryRow label="მისამართი" value={form.legalAddress} s={s} />
        ) : null}
        <SummaryRow label="დირექტორი" value={form.directorName || '—'} s={s} />
        <SummaryRow label="ობიექტი" value={form.facilityName || '—'} s={s} />

        {docType === 'labor_safety_specialist' ? (
          <>
            <SummaryRow label="სპეციალისტი" value={form.specialistName || '—'} s={s} />
            <SummaryRow label="პ/ნ" value={form.specialistPersonalId || '—'} s={s} />
            <SummaryRow label="სერტიფიკატი №" value={form.certificateNumber || '—'} s={s} />
          </>
        ) : docType === 'fire_safety_order' ? (
          <>
            <SummaryRow label="დანიშნული პირი" value={form.appointedName || '—'} s={s} />
            <SummaryRow label="ტელეფონი" value={form.appointedPhone || '—'} s={s} />
            <SummaryRow label="ობიექტი" value={form.objectName || '—'} s={s} />
            <SummaryRow label="დირექტორი ✓" value={form.directorSignature ? 'ხელმოწერილია' : '—'} s={s} />
            <SummaryRow label="პასუხისმ. ✓" value={form.appointedSignature ? 'ხელმოწერილია' : '—'} s={s} />
          </>
        ) : docType === 'fire_safety_order_enterprise' ? (
          <>
            <SummaryRow label="დანიშნული პირი" value={form.appointedName || '—'} s={s} />
            <SummaryRow label="თანამდებობა" value={form.appointedPosition || '—'} s={s} />
            <SummaryRow label="პ/ნ" value={form.appointedIdNumber || '—'} s={s} />
            <SummaryRow label="ტელეფონი" value={form.appointedPhone || '—'} s={s} />
            <SummaryRow label="ობიექტი" value={form.objectName || '—'} s={s} />
            <SummaryRow label="დირექტორი ✓" value={form.directorSignature ? 'ხელმოწერილია' : '—'} s={s} />
            <SummaryRow label="პასუხისმ. ✓" value={form.appointedSignature ? 'ხელმოწერილია' : '—'} s={s} />
          </>
        ) : (
          <>
            <SummaryRow label="პასუხისმგებელი" value={form.responsiblePersonName || '—'} s={s} />
            <SummaryRow label="თანამდებობა" value={form.responsiblePersonPosition || '—'} s={s} />
            <SummaryRow label="პ/ნ" value={form.responsiblePersonPersonalId || '—'} s={s} />
          </>
        )}

        {project ? (
          <SummaryRow label="პროექტი" value={project.name} s={s} />
        ) : null}
      </View>
    </View>
  );
}

function SummaryRow({ label, value, s }: { label: string; value: string; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ─── Step 3c — fire safety order: appointed person ────────────────────────────

function Step3FireSafety({
  form, setForm, theme: _theme, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>დანიშნული პირი</Text>

      <FloatingLabelInput
        label="სახელი, გვარი"
        required
        value={form.appointedName}
        onChangeText={v => setForm(f => ({ ...f, appointedName: v }))}
      />
      <FloatingLabelInput
        label="ტელეფონის ნომერი"
        required
        value={form.appointedPhone}
        onChangeText={v => setForm(f => ({ ...f, appointedPhone: v }))}
        keyboardType="phone-pad"
      />

      <Text style={s.sectionLabel}>ობიექტი</Text>

      <FloatingLabelInput
        label="ობიექტის დასახელება"
        required
        value={form.objectName}
        onChangeText={v => setForm(f => ({ ...f, objectName: v }))}
      />
      <FloatingLabelInput
        label="ობიექტის მისამართი"
        value={form.objectAddress}
        onChangeText={v => setForm(f => ({ ...f, objectAddress: v }))}
      />
    </View>
  );
}

// ─── Step 3d — fire safety enterprise: appointed person + extras ──────────────

function Step3FireSafetyEnterprise({
  form, setForm, theme: _theme, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>დანიშნული პირი</Text>

      <FloatingLabelInput
        label="სახელი, გვარი"
        required
        value={form.appointedName}
        onChangeText={v => setForm(f => ({ ...f, appointedName: v }))}
      />
      <FloatingLabelInput
        label="თანამდებობა"
        required
        value={form.appointedPosition}
        onChangeText={v => setForm(f => ({ ...f, appointedPosition: v }))}
      />
      <FloatingLabelInput
        label="პირადი ნომერი"
        required
        value={form.appointedIdNumber}
        onChangeText={v => setForm(f => ({ ...f, appointedIdNumber: v }))}
        keyboardType="numeric"
        maxLength={11}
      />
      <FloatingLabelInput
        label="ტელეფონის ნომერი"
        required
        value={form.appointedPhone}
        onChangeText={v => setForm(f => ({ ...f, appointedPhone: v }))}
        keyboardType="phone-pad"
      />

      <Text style={s.sectionLabel}>ობიექტი</Text>

      <FloatingLabelInput
        label="ობიექტის დასახელება"
        required
        value={form.objectName}
        onChangeText={v => setForm(f => ({ ...f, objectName: v }))}
      />
      <FloatingLabelInput
        label="ობიექტის მისამართი"
        value={form.objectAddress}
        onChangeText={v => setForm(f => ({ ...f, objectAddress: v }))}
      />
    </View>
  );
}

// ─── Step 4 (fire_safety) — director signature ────────────────────────────────

function StepSignDirector({
  form, setForm, theme, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  const [canvasOpen, setCanvasOpen] = useState(false);

  return (
    <View style={{ gap: 16 }}>
      <Text style={s.stepTitle}>დირექტორის ხელმოწერა</Text>
      <Text style={[s.summaryLabel, { width: 'auto' }]}>{form.directorName || 'დირექტორი'}</Text>

      {form.directorSignature ? (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.borderGreen ?? theme.colors.border,
          alignItems: 'center',
          padding: 12,
          gap: 8,
        }}>
          <Ionicons name="checkmark-circle" size={28} color={theme.colors.semantic.success} />
          <Text style={{ fontSize: 13, color: theme.colors.semantic.success, fontWeight: '600' }}>ხელმოწერა დადებულია</Text>
          <Pressable onPress={() => setForm(f => ({ ...f, directorSignature: null, directorSignedAt: null }))}>
            <Text style={{ fontSize: 12, color: theme.colors.inkSoft, textDecorationLine: 'underline' }}>ხელახლა ხელმოწერა</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setCanvasOpen(true)}
          style={[s.typeCard, { justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 }]}
        >
          <Ionicons name="pencil-outline" size={22} color={theme.colors.accent} />
          <Text style={[s.typeLabel, { textAlign: 'center', color: theme.colors.accent }]}>+ ხელმოწერა</Text>
        </Pressable>
      )}

      <SignatureCanvas
        visible={canvasOpen}
        personName={form.directorName || 'დირექტორი'}
        onCancel={() => setCanvasOpen(false)}
        onConfirm={(b64) => {
          setForm(f => ({ ...f, directorSignature: b64, directorSignedAt: new Date().toISOString() }));
          setCanvasOpen(false);
        }}
      />
    </View>
  );
}

// ─── Step 5 (fire_safety) — appointed person signature ────────────────────────

function StepSignAppointed({
  form, setForm, theme, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  const [canvasOpen, setCanvasOpen] = useState(false);

  return (
    <View style={{ gap: 16 }}>
      <Text style={s.stepTitle}>პასუხისმგებელი პირის ხელმოწერა</Text>
      <Text style={[s.summaryLabel, { width: 'auto' }]}>{form.appointedName || 'დანიშნული პირი'}</Text>

      {form.appointedSignature ? (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.borderGreen ?? theme.colors.border,
          alignItems: 'center',
          padding: 12,
          gap: 8,
        }}>
          <Ionicons name="checkmark-circle" size={28} color={theme.colors.semantic.success} />
          <Text style={{ fontSize: 13, color: theme.colors.semantic.success, fontWeight: '600' }}>ხელმოწერა დადებულია</Text>
          <Pressable onPress={() => setForm(f => ({ ...f, appointedSignature: null, appointedSignedAt: null }))}>
            <Text style={{ fontSize: 12, color: theme.colors.inkSoft, textDecorationLine: 'underline' }}>ხელახლა ხელმოწერა</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setCanvasOpen(true)}
          style={[s.typeCard, { justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 }]}
        >
          <Ionicons name="pencil-outline" size={22} color={theme.colors.accent} />
          <Text style={[s.typeLabel, { textAlign: 'center', color: theme.colors.accent }]}>+ ხელმოწერა</Text>
        </Pressable>
      )}

      <SignatureCanvas
        visible={canvasOpen}
        personName={form.appointedName || 'დანიშნული პირი'}
        onCancel={() => setCanvasOpen(false)}
        onConfirm={(b64) => {
          setForm(f => ({ ...f, appointedSignature: b64, appointedSignedAt: new Date().toISOString() }));
          setCanvasOpen(false);
        }}
      />
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

function makeStyles(theme: any) {
  return StyleSheet.create({
    stepTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.ink,
      marginBottom: 4,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      marginTop: 4,
      marginBottom: -4,
    },
    // type selector
    typeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    typeCardSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    typeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accentSoft,
    },
    typeIconSelected: {
      backgroundColor: theme.colors.accent,
    },
    typeLabel: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.ink,
      fontWeight: '500',
    },
    // summary
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
    },
    summaryLabel: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      width: 110,
      flexShrink: 0,
    },
    summaryValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    bottomBar: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
      paddingHorizontal: 16,
    },
  });
}
