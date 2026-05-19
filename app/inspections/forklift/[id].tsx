import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
} from 'react-native';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Button } from '../../../components/ui';
import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';
import { FlowHeader } from '../../../components/FlowHeader';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forkliftApi } from '../../../lib/forkliftService';
import { projectsApi, signaturesApi, inspectionAttachmentsApi } from '../../../lib/services';
import { signatureAsDataUrl } from '../../../lib/imageUrl';
import {
  ChecklistSection,
  IdentificationGrid,
  PhotoSection,
  QualDoc,
  SignatureBlock,
  VerdictSelector,
  type ChecklistItemData,
  type SignatoryData,
  type VerdictOption,
} from '../../../components/inspection';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import type { SignatureRecord } from '../../../types/models';
import { buildForkliftPdfHtml } from '../../../lib/forkliftPdf';
import { generateAndSharePdf, PdfLimitReachedError } from '../../../lib/pdfOpen';
import { PaywallModal } from '../../../components/PaywallModal';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { usePdfUsage, useInvalidatePdfUsage } from '../../../lib/usePdfUsage';
import { generatePdfName } from '../../../lib/pdfName';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { haptic } from '../../../lib/haptics';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';
import {
  FORKLIFT_ITEMS,
  FORKLIFT_CATEGORY_LABELS,
  FORKLIFT_VERDICT_LABEL,
  FORKLIFT_SUMMARY_CATS,
  FORKLIFT_COMPONENTS,
  ENGINE_TYPE_LABEL,
  computeForkliftVerdictSuggestion,
  forkliftSubcategoryCounts,
  type ForkliftInspection,
  type ForkliftItemState,
  type ForkliftVerdict,
  type ForkliftCategory,
} from '../../../types/forklift';

const INFO_STEP       = 0;
const CHECKLIST_STEP  = 1;
const CONCLUSION_STEP = 2;
const TOTAL_STEPS     = 3;

const FORKLIFT_CATEGORIES: ForkliftCategory[] = ['A', 'B', 'C'];

// ── Extra signer fields ───────────────────────────────────────────────────────
const SIGNER_EXTRA_FIELDS = [{ key: 'phone', label: 'ტელეფონის ნომერი' }];

export default function ForkliftInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const insets = useSafeAreaInsets();
  const { pickPhotoWithAnnotation } = usePhotoWithLocation();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const [inspection, setInspection] = useState<ForkliftInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [attachmentCount, setAttachmentCount] = useState(0);

  const [step, setStep] = useState(INFO_STEP);
  const prevStepRef = useRef(INFO_STEP);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<ForkliftInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const insp = await forkliftApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        let patched = insp;
        if (!insp.inspectorName && session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name) patched = { ...patched, inspectorName: name };
        }
        // Pre-fill signer name from inspector name if empty
        if (!patched.signerName && patched.inspectorName) {
          patched = { ...patched, signerName: patched.inspectorName };
        }
        setInspection(patched);

        if (patched.inspectorName !== insp.inspectorName) {
          forkliftApi.patch(patched.id, {
            inspectorName: patched.inspectorName,
            signerName: patched.signerName,
          }).catch(() => {});
        }

        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.company_name || p.name);
          setInspection(prev => {
            if (!prev) return prev;
            const companyFill = !prev.company?.trim() ? (p.company_name || p.name) : null;
            const addressFill = !prev.address?.trim() && p.address ? p.address : null;
            if (!companyFill && !addressFill) return prev;
            const next = {
              ...prev,
              ...(companyFill ? { company: companyFill } : {}),
              ...(addressFill ? { address: addressFill } : {}),
            };
            forkliftApi.patch(next.id, {
              ...(companyFill ? { company: next.company } : {}),
              ...(addressFill ? { address: next.address } : {}),
            }).catch(() => {});
            return next;
          });
        }).catch(() => {});

      } catch (e) {
        if (!cancelled) {
          toast.error(friendlyError(e, 'ვერ ჩაიტვირთა'));
          router.back();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          animateTimeoutRef.current = setTimeout(() => setAnimateSteps(true), 50);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (animateTimeoutRef.current) clearTimeout(animateTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: ForkliftInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      forkliftApi.patch(insp.id, {
        company: insp.company,
        address: insp.address,
        inventoryNumber: insp.inventoryNumber,
        brandModel: insp.brandModel,
        engineType: insp.engineType,
        inspectionDate: insp.inspectionDate,
        inspectorName: insp.inspectorName,
        items: insp.items,
        verdict: insp.verdict,
        notes: insp.notes,
        summaryPhotos: insp.summaryPhotos,
        qualDocPath: insp.qualDocPath,
        signerName: insp.signerName,
        signerPosition: insp.signerPosition,
        signerPhone: insp.signerPhone,
        signerSignature: insp.signerSignature,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof ForkliftInspection>(
    key: K,
    value: ForkliftInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateItem = useCallback((
    itemId: number,
    patch: Partial<Pick<ForkliftItemState, 'result' | 'comment'>>,
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i =>
        i.id === itemId ? { ...i, ...patch } : i,
      );
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Photo handling ─────────────────────────────────────────────────────────

  const handleAddPhoto = useCallback(async (itemId: number) => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await forkliftApi.uploadPhoto(insp.id, itemId, result.uri);
      setInspection(prev => {
        if (!prev) return prev;
        const items = prev.items.map(i =>
          i.id === itemId ? { ...i, photo_paths: [...(i.photo_paths ?? []), path] } : i,
        );
        const next = { ...prev, items };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  }, [pickPhotoWithAnnotation, scheduleSave, toast]);

  const handleDeletePhoto = useCallback(async (itemId: number, path: string) => {
    try {
      await forkliftApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i =>
        i.id === itemId ? { ...i, photo_paths: (i.photo_paths ?? []).filter(p => p !== path) } : i,
      );
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast]);

  const handleAddSummaryPhoto = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await forkliftApi.uploadSummaryPhoto(insp.id, result.uri);
      setInspection(prev => {
        if (!prev) return prev;
        const next = { ...prev, summaryPhotos: [...(prev.summaryPhotos ?? []), path] };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  }, [pickPhotoWithAnnotation, scheduleSave, toast]);

  const handleDeleteSummaryPhoto = useCallback(async (path: string) => {
    try {
      await forkliftApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, summaryPhotos: (prev.summaryPhotos ?? []).filter(p => p !== path) };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast]);

  const handleAddQualDoc = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await forkliftApi.uploadQualDoc(insp.id, result.uri);
      setInspection(prev => {
        if (!prev) return prev;
        const next = { ...prev, qualDocPath: path };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  }, [pickPhotoWithAnnotation, scheduleSave, toast]);

  const handleDeleteQualDoc = useCallback(async () => {
    const insp = inspectionRef.current;
    if (!insp?.qualDocPath) return;
    try {
      await forkliftApi.deletePhoto(insp.qualDocPath);
    } catch {}
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, qualDocPath: null };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Signer ────────────────────────────────────────────────────────────────

  const handleSignerChange = useCallback((
    _index: number,
    field: string,
    value: string,
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      let next = prev;
      if (field === 'name')           next = { ...prev, signerName: value };
      else if (field === 'position')  next = { ...prev, signerPosition: value };
      else if (field === 'extra.phone') next = { ...prev, signerPhone: value };
      else if (field === 'signature') next = { ...prev, signerSignature: value || null };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const handleSign = useCallback((_index: number, base64Png: string) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, signerSignature: base64Png };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Load signatures/attachments when completed ────────────────────────────

  useEffect(() => {
    if (inspection?.status !== 'completed') return;
    signaturesApi.list(inspection.id).then(setSignatures).catch(() => {});
    inspectionAttachmentsApi.listByInspection(inspection.id)
      .then(a => setAttachmentCount(a.length)).catch(() => {});
  }, [inspection?.status, inspection?.id]);

  // ── Complete ───────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!inspection) return;
    const missing: string[] = [];
    if (!inspection.brandModel?.trim())     missing.push('მარკა / მოდელი');
    if (!inspection.inventoryNumber?.trim()) missing.push('ინვენტ. / სერიული ნომერი');
    if (!inspection.verdict)                 missing.push('დასკვნა');

    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }
    setCompleting(true);
    try {
      await forkliftApi.patch(inspection.id, {
        company: inspection.company,
        address: inspection.address,
        inventoryNumber: inspection.inventoryNumber,
        brandModel: inspection.brandModel,
        engineType: inspection.engineType,
        inspectionDate: inspection.inspectionDate,
        inspectorName: inspection.inspectorName,
        items: inspection.items,
        verdict: inspection.verdict,
        notes: inspection.notes,
        summaryPhotos: inspection.summaryPhotos,
        qualDocPath: inspection.qualDocPath,
        signerName: inspection.signerName,
        signerPosition: inspection.signerPosition,
        signerPhone: inspection.signerPhone,
        signerSignature: inspection.signerSignature,
      });
      await forkliftApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:forklift_inspection`,
      ).catch(() => {});
      setInspection(prev => prev ? { ...prev, status: 'completed', completedAt } : prev);
      toast.success('შემოწმება დასრულდა');
      setCelebrating(true);
      haptic.inspectionComplete();
      celebrationTimer.current = setTimeout(() => setCelebrating(false), 2000);
    } catch (e) {
      toast.error(friendlyError(e, 'შეცდომა'));
    } finally {
      setCompleting(false);
    }
  }, [inspection, toast]);

  // ── PDF ────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await buildForkliftPdfHtml({
        inspection,
        projectName: projectName || 'პროექტი',
      });
      const pdfName = generatePdfName(
        projectName || 'project',
        'ForkliftInspection',
        new Date(inspection.inspectionDate),
        inspection.id,
      );
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, userId, {
        title: 'ჩანგლიანი დამტვირთველი',
        author: inspection.inspectorName || undefined,
        documentId: inspection.id,
        subject: 'შრომის უსაფრთხოების შემოწმება',
      });
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [inspection, projectName, session.state, invalidatePdfUsage, toast, pdfUsage?.isLocked]);

  // ── PDF Preview (completed) ────────────────────────────────────────────────

  const buildPreview = useCallback(async (sigs: SignatureRecord[] = signatures) => {
    if (!inspection) return;
    setPreviewBusy(true);
    try {
      const sigsEmbedded = await Promise.all(
        sigs.map(async sig => {
          if (!sig.signature_png_url || sig.signature_png_url.startsWith('data:')) return sig;
          const dataUrl = await signatureAsDataUrl(STORAGE_BUCKETS.signatures, sig.signature_png_url)
            .catch(() => sig.signature_png_url ?? '');
          return { ...sig, signature_png_url: dataUrl };
        }),
      );
      void sigsEmbedded; // not used in forklift PDF (uses inline signer_signature)
      const html = await buildForkliftPdfHtml({
        inspection,
        projectName: projectName || 'პროექტი',
      });
      setPreviewHtml(html);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setPreviewBusy(false);
    }
  }, [inspection, projectName, signatures, toast]);

  useEffect(() => {
    if (inspection?.status === 'completed') void buildPreview();
  }, [inspection?.status, buildPreview]);

  useEffect(() => {
    return () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); };
  }, []);

  // ── Step navigation ────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === INFO_STEP) {
      return !!inspection.brandModel?.trim() && !!inspection.inventoryNumber?.trim();
    }
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !completing;
    return true;
  }, [step, inspection, completing]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await handleComplete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, handleComplete]);

  const handlePrev = useCallback(() => {
    if (step === INFO_STEP) router.back();
    else setStep(s => s - 1);
  }, [step, router]);

  // ── Checklist item data builders ───────────────────────────────────────────

  const checklistItemsFor = useCallback(
    (cat: ForkliftCategory): ChecklistItemData[] => {
      if (!inspection) return [];
      return FORKLIFT_ITEMS.filter(e => e.category === cat).map(entry => {
        const state = inspection.items.find(i => i.id === entry.id)
          ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
        return {
          id: entry.id,
          label: entry.label,
          description: entry.description,
          type: 'three_state' as const,
          options: { a: 'good', b: 'deficient', c: 'unusable' },
          value: state.result,
          comment: state.comment,
          photoPaths: state.photo_paths ?? [],
        };
      });
    },
    [inspection],
  );

  // ── Verdict suggestion ─────────────────────────────────────────────────────

  const verdictSuggestion = useMemo(
    () => inspection ? computeForkliftVerdictSuggestion(inspection.items) : null,
    [inspection],
  );

  // ── Signatories for SignatureBlock ─────────────────────────────────────────

  const signatories = useMemo<SignatoryData[]>(() => {
    if (!inspection) return [];
    return [{
      role: 'უსაფრთ.სპეც. / ტექნიკოსი / ოპერატორი',
      name: inspection.signerName ?? '',
      position: inspection.signerPosition ?? '',
      extra: { phone: inspection.signerPhone ?? '' },
      signature: inspection.signerSignature,
    }];
  }, [inspection]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    const signedCount = signatures.filter(s => s.status === 'signed' && !!s.signature_png_url).length;
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ჩანგლიანი დამტვირთველი"
        requiredSignerRoles={[]}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        signedCount={signedCount}
        totalSlots={signatures.length}
        attachmentCount={attachmentCount}
        pdfLocked={pdfUsage?.isLocked}
        downloading={generatingPdf}
        paywallVisible={paywallVisible}
        onPaywallClose={() => setPaywallVisible(false)}
        onDownloadPdf={() => void handlePdf()}
        onSheetSaved={() => {
          signaturesApi.list(inspection.id).then(sigs => {
            setSignatures(sigs);
            void buildPreview(sigs);
          }).catch(() => {});
          inspectionAttachmentsApi.listByInspection(inspection.id)
            .then(a => setAttachmentCount(a.length)).catch(() => {});
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle="ჩანგლიანი დამტვირთველი"
        project={projectName ? { name: projectName } : null}
        step={step + 1}
        totalSteps={TOTAL_STEPS}
        leading="back"
        trailing="close"
        onClose={() => router.back()}
        trailingElement={
          step > 0 ? (
            <Ionicons
              name={generatingPdf ? 'hourglass-outline' : 'document-text-outline'}
              size={22}
              color={theme.colors.accent}
              onPress={() => void handlePdf()}
              {...a11y('PDF', 'PDF გენერირება', 'button')}
            />
          ) : null
        }
        onBack={handlePrev}
        backDisabled={false}
      />

      {saving && (
        <Text style={styles.savingHint}>შენახვა…</Text>
      )}

      <View style={{ flex: 1 }}>
        <WizardStepTransition stepKey={step} direction={direction} animate={animateSteps}>

          {/* ── Step 0: Identification ──────────────────────────────────── */}
          {step === INFO_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <IdentificationGrid
                fields={[
                  {
                    label: 'ინვენტ. / სერიული ნომერი *',
                    value: inspection.inventoryNumber ?? '',
                    onChange: v => update('inventoryNumber', v || null),
                  },
                  {
                    label: 'მარკა / მოდელი *',
                    value: inspection.brandModel ?? '',
                    onChange: v => update('brandModel', v || null),
                  },
                  {
                    label: 'ძრავის ტიპი',
                    type: 'chips',
                    value: inspection.engineType ?? '',
                    onChange: v => update('engineType', (v || null) as ForkliftInspection['engineType']),
                    options: ['electric', 'gasoline', 'diesel', 'gas'],
                    optionLabels: [
                      ENGINE_TYPE_LABEL.electric,
                      ENGINE_TYPE_LABEL.gasoline,
                      ENGINE_TYPE_LABEL.diesel,
                      ENGINE_TYPE_LABEL.gas,
                    ],
                  },
                ]}
                columns={2}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 1: Component Diagram + Checklist ───────────────────── */}
          {step === CHECKLIST_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              {/* Component diagram — static info card */}
              <View style={styles.compCard}>
                <Text style={styles.compCardTitle}>კომპონენტები (A–K)</Text>
                <View style={styles.compGrid}>
                  {FORKLIFT_COMPONENTS.map(c => (
                    <Text key={c.key} style={styles.compItem}>
                      <Text style={styles.compKey}>{c.key} </Text>
                      {c.label}
                    </Text>
                  ))}
                </View>
              </View>

              {/* Checklist sections */}
              {FORKLIFT_CATEGORIES.map(cat => (
                <ChecklistSection
                  key={cat}
                  title={FORKLIFT_CATEGORY_LABELS[cat]}
                  items={checklistItemsFor(cat)}
                  onItemChange={(itemId, field, val) => {
                    if (field === 'value') {
                      updateItem(itemId, { result: (val as ForkliftItemState['result']) });
                    } else {
                      updateItem(itemId, { comment: val });
                    }
                  }}
                  onAddPhoto={itemId => void handleAddPhoto(itemId)}
                  onDeletePhoto={(itemId, path) => void handleDeletePhoto(itemId, path)}
                />
              ))}
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Summary Table + Verdict + Signature ─────────────── */}
          {step === CONCLUSION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              {/* Summary table */}
              <Text style={styles.sectionLabel}>შეჯამება</Text>
              <View style={styles.sumTable}>
                <View style={[styles.sumRow, styles.sumHeaderRow]}>
                  <Text style={[styles.sumCell, styles.sumCatCell, styles.sumHeaderText]}>კატეგ.</Text>
                  <Text style={[styles.sumCountCell, styles.sumHeaderText]}>✓</Text>
                  <Text style={[styles.sumCountCell, styles.sumHeaderText]}>⚠</Text>
                  <Text style={[styles.sumCountCell, styles.sumHeaderText]}>✗</Text>
                </View>
                {FORKLIFT_SUMMARY_CATS.map(cat => {
                  const c = forkliftSubcategoryCounts(inspection.items, cat.ids);
                  return (
                    <View key={cat.label} style={styles.sumRow}>
                      <Text style={[styles.sumCell, styles.sumCatCell]}>{cat.label}</Text>
                      <Text style={[styles.sumCountCell, c.good > 0 && styles.cntGood]}>{c.good > 0 ? c.good : '—'}</Text>
                      <Text style={[styles.sumCountCell, c.deficient > 0 && styles.cntDef]}>{c.deficient > 0 ? c.deficient : '—'}</Text>
                      <Text style={[styles.sumCountCell, c.unusable > 0 && styles.cntBad]}>{c.unusable > 0 ? c.unusable : '—'}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Verdict */}
              <Text style={styles.sectionLabel}>დასკვნა *</Text>
              {verdictSuggestion && verdictSuggestion !== inspection.verdict && (
                <View style={styles.suggestionBanner}>
                  <Ionicons name="bulb-outline" size={14} color={theme.colors.warn} />
                  <Text style={styles.suggestionText}>
                    შემოწმების შედეგები: «{FORKLIFT_VERDICT_LABEL[verdictSuggestion]}»
                  </Text>
                </View>
              )}
              <VerdictSelector
                options={([
                  { value: 'approved', label: FORKLIFT_VERDICT_LABEL.approved, type: 'success' },
                  { value: 'limited',  label: FORKLIFT_VERDICT_LABEL.limited,  type: 'warning' },
                  { value: 'rejected', label: FORKLIFT_VERDICT_LABEL.rejected, type: 'danger'  },
                ] as VerdictOption[])}
                value={inspection.verdict}
                onChange={v => update('verdict', v as ForkliftVerdict)}
                note={inspection.notes ?? ''}
                onNoteChange={v => update('notes', v || null)}
                notePlaceholder="შენიშვნები / ხარვეზები"
              />

              {/* Qual doc */}
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>კვალიფიკ. დოკ.</Text>
              <QualDoc
                photoPath={inspection.qualDocPath}
                onAdd={() => void handleAddQualDoc()}
                onDelete={() => void handleDeleteQualDoc()}
              />

              {/* Summary photos */}
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>ფოტოები</Text>
              <PhotoSection
                photoPaths={inspection.summaryPhotos ?? []}
                onAdd={handleAddSummaryPhoto}
                onDelete={handleDeleteSummaryPhoto}
              />

              {/* Signature */}
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>ხელმოწერა</Text>
              <SignatureBlock
                signatories={signatories}
                onChange={handleSignerChange}
                onSign={handleSign}
                extraFields={SIGNER_EXTRA_FIELDS}
              />

              {completing && (
                <View style={styles.completingRow}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.completingText}>მიმდინარეობს…</Text>
                </View>
              )}
            </KeyboardAwareScrollView>
          )}
        </WizardStepTransition>

        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          {step === CONCLUSION_STEP ? (
            <Button
              title="შენახვა და დასრულება"
              style={{ paddingVertical: 14 }}
              iconRight={<Ionicons name="checkmark" size={20} color={theme.colors.white} />}
              loading={completing}
              disabled={!canGoNext || completing}
              onPress={handleNext}
            />
          ) : (
            <Button
              title={canGoNext ? 'შემდეგი' : 'გაგრძელება'}
              variant={canGoNext ? 'primary' : 'secondary'}
              size="lg"
              style={{ alignSelf: 'stretch', paddingVertical: 16, justifyContent: 'center' }}
              iconRight={
                canGoNext ? (
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.white} />
                ) : undefined
              }
              onPress={handleNext}
            />
          )}
        </View>
      </View>

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
      {celebrating && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <CelebrationBurst />
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 24, paddingTop: 4 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 12 },
    footer: {
      gap: 10, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16,
      backgroundColor: theme.colors.card,
    },
    sectionLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    // Component diagram
    compCard: {
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 10, padding: 12, gap: 8,
      borderWidth: 1, borderColor: theme.colors.hairline,
    },
    compCardTitle: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft, textTransform: 'uppercase' },
    compGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    compItem: { width: '50%', fontSize: 11, color: theme.colors.ink },
    compKey: { fontWeight: '800', color: theme.colors.accent },
    // Summary table
    sumTable: { borderWidth: 1, borderColor: theme.colors.hairline, borderRadius: 8, overflow: 'hidden' },
    sumRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline },
    sumHeaderRow: { backgroundColor: theme.colors.subtleSurface },
    sumCell: { flex: 1, padding: 8, fontSize: 11, color: theme.colors.ink },
    sumCatCell: { flex: 3 },
    sumCountCell: { width: 40, textAlign: 'center', padding: 8, fontSize: 13, color: theme.colors.inkSoft },
    sumHeaderText: { fontWeight: '700', color: theme.colors.inkSoft, fontSize: 10 },
    cntGood: { color: theme.colors.semantic.success, fontWeight: '700' },
    cntDef:  { color: theme.colors.warn, fontWeight: '700' },
    cntBad:  { color: theme.colors.danger, fontWeight: '700' },
    // Verdict suggestion banner
    suggestionBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.warnSoft,
      padding: 10, borderRadius: 8, marginBottom: 4,
    },
    suggestionText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },
    // Completing
    completingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
    completingText: { fontSize: 13, color: theme.colors.inkSoft },
  });
}
