import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Button } from '../../../components/ui';
import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';
import { FlowHeader } from '../../../components/FlowHeader';
import { InspectionResultView } from '../../../components/InspectionResultView';
import {
  ChecklistSection,
  DynamicTable,
  VerdictSelector,
  PhotoSection,
  IdentificationGrid,
  QualDoc,
} from '../../../components/inspection';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safetyNetApi } from '../../../lib/safetyNetService';
import { projectsApi } from '../../../lib/services';
import { renderInspectionPdf } from '../../../lib/inspection/renderMobile';
import { safetyNetSchema } from '../../../lib/inspection/schemas/safetyNet';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';
import { SignatureSheet } from '../../../components/inspection/SignatureSheet';
import {
  SN_VISUAL_ITEMS,
  SN_POST_TEST_ITEMS,
  SN_VERDICT_LABEL,
  SAFETY_NET_TEMPLATE_ID,
  buildDefaultSNLoadTestRow,
  computeSNVerdictSuggestion,
  snTotalWeight,
  type SafetyNetInspection,
  type SNVerdict,
  type SNResult,
  type SNPostResult,
  type SNSignatory,
} from '../../../types/safetyNet';

// ── Step constants ────────────────────────────────────────────────────────────
const NET_ID_STEP     = 1;
const INSPECTION_STEP = 2;
const CONCLUSION_STEP = 3;
const DOCS_STEP       = 4;
const TOTAL_STEPS     = 4;
const STEP_LABELS     = ['ბადე', 'შემოწ.', 'დასკვნა', 'დოკ.'];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SafetyNetInspectionScreen() {
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

  const [inspection, setInspection] = useState<SafetyNetInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const [step, setStep] = useState(NET_ID_STEP);
  const prevStepRef = useRef(NET_ID_STEP);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<SafetyNetInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const persistKey = useMemo(() => `safety-net-wizard:${id}:step`, [id]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const insp = await safetyNetApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        let patched = insp;
        if (!insp.inspectorName && session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name) {
            patched = { ...patched, inspectorName: name };
            const sigs = [...patched.signatures];
            if (!sigs[0].name) sigs[0] = { ...sigs[0], name };
            patched = { ...patched, signatures: sigs };
          }
        }
        if (patched.inspectorName !== insp.inspectorName) {
          safetyNetApi.patch(patched.id, {
            inspectorName: patched.inspectorName,
          }).catch(() => {});
        }

        if (insp.status !== 'completed') {
          const saved = await AsyncStorage.getItem(persistKey);
          if (saved && !cancelled) {
            const s = parseInt(saved, 10);
            if (!isNaN(s) && s >= NET_ID_STEP && s <= DOCS_STEP) setStep(s);
          }
        }

        try {
          const p = await projectsApi.getById(insp.projectId);
          if (p) {
            setProjectName(p.company_name || p.name);
            const companyFill = !patched.company?.trim() ? (p.company_name || p.name) : null;
            const addressFill = !patched.address?.trim() && p.address ? p.address : null;
            if (companyFill || addressFill) {
              patched = {
                ...patched,
                ...(companyFill ? { company: companyFill } : {}),
                ...(addressFill ? { address: addressFill } : {}),
              };
              safetyNetApi.patch(patched.id, {
                ...(companyFill ? { company: patched.company } : {}),
                ...(addressFill ? { address: patched.address } : {}),
              }).catch(() => {});
            }
          }
        } catch {
          // project fetch is best-effort
        }

        if (!cancelled) setInspection(patched);
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

  useEffect(() => {
    if (step >= NET_ID_STEP && step <= DOCS_STEP) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey]);

  useEffect(() => {
    return () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); };
  }, []);

  // ── Auto-save (debounced) ───────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: SafetyNetInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      safetyNetApi.patch(insp.id, {
        company: insp.company,
        address: insp.address,
        inspectorName: insp.inspectorName,
        inspectionDate: insp.inspectionDate,
        manufacturer: insp.manufacturer,
        netSize: insp.netSize,
        postSize: insp.postSize,
        postCount: insp.postCount,
        postAnchorCount: insp.postAnchorCount,
        anchorPointCount: insp.anchorPointCount,
        edgeRopeCount: insp.edgeRopeCount,
        cellSide: insp.cellSide,
        workingDistance: insp.workingDistance,
        certificate: insp.certificate,
        items: insp.items,
        loadTestRows: insp.loadTestRows,
        postTestItems: insp.postTestItems,
        verdict: insp.verdict,
        verdictComment: insp.verdictComment,
        qualDocPath: insp.qualDocPath,
        summaryPhotos: insp.summaryPhotos,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof SafetyNetInspection>(
    key: K,
    value: SafetyNetInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Items ───────────────────────────────────────────────────────────────────

  const updateItem = useCallback((id: number, patch: { result?: SNResult | null; comment?: string | null }) => {
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i => i.id === id ? { ...i, ...patch } : i);
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updatePostTestItem = useCallback((id: number, result: SNPostResult | null) => {
    setInspection(prev => {
      if (!prev) return prev;
      const postTestItems = prev.postTestItems.map(i => i.id === id ? { ...i, result } : i);
      const next = { ...prev, postTestItems };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Load test rows ──────────────────────────────────────────────────────────

  const handleLoadTestChange = useCallback((rows: Record<string, any>[]) => {
    setInspection(prev => {
      if (!prev) return prev;
      const loadTestRows = rows.map(r => ({
        ...r,
        totalWeightKg: (r.unitWeightKg != null && r.quantity != null)
          ? r.unitWeightKg * r.quantity
          : null,
      })) as typeof prev.loadTestRows;
      const next = { ...prev, loadTestRows };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Photos ──────────────────────────────────────────────────────────────────

  const handleAddItemPhoto = useCallback(async (itemId: number) => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await safetyNetApi.uploadPhoto(insp.id, itemId, result.uri);
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

  const handleDeleteItemPhoto = useCallback(async (itemId: number, path: string) => {
    try {
      await safetyNetApi.deletePhoto(path);
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

  const handleAddQualDoc = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await safetyNetApi.uploadPhoto(insp.id, 'qual-doc', result.uri);
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
      await safetyNetApi.deletePhoto(insp.qualDocPath);
    } catch {
      // best-effort
    }
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, qualDocPath: null };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const handleAddSummaryPhoto = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await safetyNetApi.uploadPhoto(insp.id, 'summary', result.uri);
      setInspection(prev => {
        if (!prev) return prev;
        const next = { ...prev, summaryPhotos: [...prev.summaryPhotos, path] };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  }, [pickPhotoWithAnnotation, scheduleSave, toast]);

  const handleDeleteSummaryPhoto = useCallback(async (path: string) => {
    try {
      await safetyNetApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, summaryPhotos: prev.summaryPhotos.filter(p => p !== path) };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast]);

  // ── Signatories ─────────────────────────────────────────────────────────────

  const handleSignatoryChange = useCallback((idx: number, field: string, value: string) => {
    setInspection(prev => {
      if (!prev) return prev;
      const sigs = [...prev.signatures];
      sigs[idx] = { ...sigs[idx], [field]: field === 'signature' ? (value || null) : value };
      return { ...prev, signatures: sigs };
    });
  }, []);

  const handleSignatorySign = useCallback((idx: number, base64Png: string) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    const sigs = [...insp.signatures];
    sigs[idx] = { ...sigs[idx], signature: base64Png, date: new Date().toISOString() };
    setInspection({ ...insp, signatures: sigs });
  }, []);

  // ── Verdict auto-suggest ────────────────────────────────────────────────────

  const suggestedVerdict = useMemo(
    () => inspection ? computeSNVerdictSuggestion(inspection.items, inspection.postTestItems) : null,
    [inspection?.items, inspection?.postTestItems],
  );

  // ── PDF ─────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    const insp = inspectionRef.current;
    if (!insp) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await renderInspectionPdf(safetyNetSchema, { inspection: insp, projectName: projectName || 'პროექტი' });
      const pdfName = generatePdfName(
        projectName || 'project',
        'SafetyNetInspection',
        new Date(insp.inspectionDate),
        insp.id,
      );
      const uid = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, uid, {
        title: 'უსაფრთხოების ბადის შემოწმების აქტი',
        author: insp.inspectorName || undefined,
        documentId: insp.id,
        subject: 'შრომის უსაფრთხოება',
      });
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [projectName, session.state, invalidatePdfUsage, toast, pdfUsage]);

  // ── Preview (completed) ─────────────────────────────────────────────────────

  const buildPreview = useCallback(async () => {
    const insp = inspectionRef.current;
    if (!insp) return;
    setPreviewBusy(true);
    try {
      const html = await renderInspectionPdf(safetyNetSchema, { inspection: insp, projectName: projectName || 'პროექტი' });
      setPreviewHtml(html);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setPreviewBusy(false);
    }
  }, [projectName, toast]);

  useEffect(() => {
    if (inspection?.status === 'completed') void buildPreview();
  }, [inspection?.status]);

  // ── Complete ────────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!inspection) return;
    const missing: string[] = [];
    if (!inspection.verdict) missing.push('დასკვნა');

    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }

    setCompleting(true);
    try {
      await safetyNetApi.patch(inspection.id, {
        company: inspection.company,
        address: inspection.address,
        inspectorName: inspection.inspectorName,
        inspectionDate: inspection.inspectionDate,
        manufacturer: inspection.manufacturer,
        netSize: inspection.netSize,
        postSize: inspection.postSize,
        postCount: inspection.postCount,
        postAnchorCount: inspection.postAnchorCount,
        anchorPointCount: inspection.anchorPointCount,
        edgeRopeCount: inspection.edgeRopeCount,
        cellSide: inspection.cellSide,
        workingDistance: inspection.workingDistance,
        certificate: inspection.certificate,
        items: inspection.items,
        loadTestRows: inspection.loadTestRows,
        postTestItems: inspection.postTestItems,
        verdict: inspection.verdict,
        verdictComment: inspection.verdictComment,
        qualDocPath: inspection.qualDocPath,
        summaryPhotos: inspection.summaryPhotos,
      });
      await safetyNetApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:${SAFETY_NET_TEMPLATE_ID}`,
      ).catch(() => {});
      setInspection(prev => prev ? { ...prev, status: 'completed', completedAt } : prev);
      await AsyncStorage.removeItem(persistKey);
      toast.success('შემოწმება დასრულდა');
      setCelebrating(true);
      haptic.inspectionComplete();
      celebrationTimer.current = setTimeout(() => setCelebrating(false), 2000);
    } catch (e) {
      toast.error(friendlyError(e, 'შეცდომა'));
    } finally {
      setCompleting(false);
    }
  }, [inspection, persistKey, toast]);

  // ── Step navigation ──────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === CONCLUSION_STEP) return !!inspection.verdict;
    return true;
  }, [step, inspection, completing]);

  const handleNext = useCallback(async () => {
    if (step === DOCS_STEP) {
      await handleComplete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, handleComplete]);

  const handlePrev = useCallback(async () => {
    if (step === NET_ID_STEP) {
      await AsyncStorage.removeItem(persistKey);
      router.back();
    } else {
      setStep(s => s - 1);
    }
  }, [step, persistKey, router]);

  // ── Loading & completed ─────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'ბადის შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="უსაფრთხოების ბადე"
        requiredSignerRoles={[]}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        signedCount={inspection.signatures.filter(s => !!s.signature).length}
        totalSlots={inspection.signatures.length}
        attachmentCount={0}
        pdfLocked={pdfUsage?.isLocked}
        downloading={generatingPdf}
        paywallVisible={paywallVisible}
        onPaywallClose={() => setPaywallVisible(false)}
        onDownloadPdf={() => void handlePdf()}
        onSheetSaved={() => void buildPreview()}
        renderSignaturesSheet={({ dismiss, onChanged }) => (
          <SignatureSheet
            onClose={dismiss}
            signatories={[
              { role: 'I ხელმომწერი', ...inspection.signatures[0] },
              { role: 'II ხელმომწერი', ...inspection.signatures[1] },
            ]}
            onChange={handleSignatoryChange}
            onSign={(idx, base64) => {
              handleSignatorySign(idx, base64);
              onChanged();
            }}
          />
        )}
      />
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle="ბადის შემოწმება"
        project={projectName ? { name: projectName } : null}
        step={step}
        totalSteps={TOTAL_STEPS}
        leading="back"
        trailing="close"
        onClose={() => router.back()}
        trailingElement={(
          <Pressable
            onPress={handlePdf}
            disabled={generatingPdf}
            hitSlop={10}
            {...a11y('PDF', 'PDF დოკუმენტის გენერირება', 'button')}
          >
            <Ionicons
              name={generatingPdf ? 'hourglass-outline' : 'document-text-outline'}
              size={22}
              color={theme.colors.accent}
            />
          </Pressable>
        )}
        onBack={handlePrev}
        backDisabled={false}
      />

      {saving && <Text style={styles.savingHint}>შენახვა…</Text>}

      {pdfUsage?.isLocked && <PdfLockedBanner onSubscribe={() => setPaywallVisible(true)} />}

      <View style={{ flex: 1 }}>
        <WizardStepTransition stepKey={step} direction={direction} animate={animateSteps}>

          {/* ── Step 1: Net ID ───────────────────────────────────────────────── */}
          {step === NET_ID_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <IdentificationGrid
                fields={[
                  { label: 'მწარმოებელი', value: inspection.manufacturer, onChange: v => update('manufacturer', v) },
                  { label: 'ბადის ზომა მ×მ', value: inspection.netSize, onChange: v => update('netSize', v) },
                  { label: 'დგარის ზომა', value: inspection.postSize, onChange: v => update('postSize', v) },
                  { label: 'დგარების რ-ბა', value: inspection.postCount != null ? String(inspection.postCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('postCount', isNaN(n) ? null : n); } },
                  { label: 'დგარის სამაგრების რ-ბა', value: inspection.postAnchorCount != null ? String(inspection.postAnchorCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('postAnchorCount', isNaN(n) ? null : n); } },
                  { label: 'სამაგრი წერტილების რ-ბა', value: inspection.anchorPointCount != null ? String(inspection.anchorPointCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('anchorPointCount', isNaN(n) ? null : n); } },
                  { label: 'კიდის ბაგირების რ-ბა', value: inspection.edgeRopeCount != null ? String(inspection.edgeRopeCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('edgeRopeCount', isNaN(n) ? null : n); } },
                  { label: 'უჯრედის მხარე', value: inspection.cellSide, onChange: v => update('cellSide', v) },
                  { label: 'სამუშაო მანძილი', value: inspection.workingDistance, onChange: v => update('workingDistance', v) },
                  {
                    label: 'ბადის სერტიფიკატი',
                    value: inspection.certificate ?? '',
                    type: 'chips',
                    options: ['none', 'active', 'expired'],
                    optionLabels: ['სერტ. არ გააჩნია', 'მოქმედი სერტ.', 'ვადაგასული'],
                    onChange: v => update('certificate', v as SafetyNetInspection['certificate']),
                    isProblematic: inspection.certificate === 'expired' || inspection.certificate === 'none',
                  },
                ]}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Inspection ───────────────────────────────────────────── */}
          {step === INSPECTION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 8 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <ChecklistSection
                title="ვიზუალური შემოწმება"
                items={SN_VISUAL_ITEMS.map(e => {
                  const state = inspection.items.find(i => i.id === e.id)
                    ?? { id: e.id, result: null, comment: null, photo_paths: [] };
                  return {
                    id: e.id,
                    label: e.label,
                    description: e.description || undefined,
                    type: 'three_state' as const,
                    options: { a: 'good', b: 'fix', c: 'N/A', cIsNeutral: true },
                    value: state.result === 'na' ? 'N/A' : state.result,
                    comment: state.comment,
                    photoPaths: state.photo_paths ?? [],
                  };
                })}
                onItemChange={(id, field, val) => {
                  if (field === 'value') {
                    const result: SNResult | null = val === 'N/A' ? 'na' : val as SNResult | null;
                    updateItem(id, { result });
                  } else {
                    updateItem(id, { comment: val });
                  }
                }}
                onAddPhoto={handleAddItemPhoto}
                onDeletePhoto={handleDeleteItemPhoto}
              />

              <Text style={styles.loadInstruction}>
                180კგ-ის სიმძიმე 1მ სიმაღლიდან — №477 დადგენილება
              </Text>

              <DynamicTable
                columns={[
                  { key: 'name', label: 'დასახელება', type: 'text' },
                  { key: 'unitWeightKg', label: 'ერთ.წ.(კგ)', type: 'number', keyboardType: 'decimal-pad' },
                  { key: 'quantity', label: 'რ-ბა', type: 'number', keyboardType: 'numeric' },
                  { key: 'totalWeightKg', label: 'სულ(კგ)', type: 'readonly' },
                  { key: 'comment', label: 'კომ.', type: 'text' },
                ]}
                rows={inspection.loadTestRows}
                onChange={handleLoadTestChange}
                onBuildDefaultRow={buildDefaultSNLoadTestRow}
                minRows={0}
                footer={
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.totalLabel}>სულ:</Text>
                    <Text style={styles.totalValue}>{snTotalWeight(inspection.loadTestRows)} კგ</Text>
                  </View>
                }
              />

              <ChecklistSection
                title="ტვირთის ჩაგდების შემდეგ შემოწმება"
                items={SN_POST_TEST_ITEMS.map(e => {
                  const state = inspection.postTestItems.find(i => i.id === e.id)
                    ?? { id: e.id, result: null };
                  return {
                    id: e.id,
                    label: e.label,
                    type: 'binary' as const,
                    options: { a: 'pass', b: 'fail' },
                    value: state.result,
                  };
                })}
                onItemChange={(id, field, val) => {
                  if (field === 'value') {
                    updatePostTestItem(id, val as SNPostResult | null);
                  }
                }}
                onAddPhoto={() => {}}
                onDeletePhoto={() => {}}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 3: Conclusion ───────────────────────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              {suggestedVerdict && inspection.verdict !== suggestedVerdict && (
                <Pressable
                  style={styles.suggestBanner}
                  onPress={() => update('verdict', suggestedVerdict)}
                >
                  <Ionicons name="bulb-outline" size={16} color={theme.colors.warn} />
                  <Text style={styles.suggestText}>
                    შემოთავაზება: {SN_VERDICT_LABEL[suggestedVerdict]}
                  </Text>
                </Pressable>
              )}

              <Text style={styles.fieldLabel}>დასკვნა *</Text>
              <VerdictSelector
                options={[
                  { value: 'pass', label: SN_VERDICT_LABEL.pass, type: 'success' },
                  { value: 'fail', label: SN_VERDICT_LABEL.fail, type: 'danger' },
                ]}
                value={inspection.verdict}
                onChange={v => update('verdict', v as SNVerdict)}
                note={inspection.verdictComment}
                onNoteChange={v => update('verdictComment', v)}
                notePlaceholder="კომენტარი"
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 4: Documents & Photos ──────────────────────────────────── */}
          {step === DOCS_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <Text style={styles.fieldLabel}>კვალიფიკაციის / სერტიფიკატის დოკუმენტი</Text>
              <QualDoc
                photoPath={inspection.qualDocPath}
                onAdd={handleAddQualDoc}
                onDelete={handleDeleteQualDoc}
              />

              <Text style={styles.fieldLabel}>ფოტო / ვიდეო მასალა (სურვ.)</Text>
              <PhotoSection
                photoPaths={inspection.summaryPhotos}
                onAdd={handleAddSummaryPhoto}
                onDelete={handleDeleteSummaryPhoto}
              />
            </KeyboardAwareScrollView>
          )}

        </WizardStepTransition>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          {step === DOCS_STEP ? (
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
                canGoNext
                  ? <Ionicons name="chevron-forward" size={18} color={theme.colors.white} />
                  : undefined
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
    stepBody: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 },
    footer: { gap: 10, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, backgroundColor: theme.colors.card },

    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },

    loadInstruction: {
      fontSize: 11, color: theme.colors.inkSoft, fontStyle: 'italic',
      backgroundColor: theme.colors.warnSoft,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 6, borderLeftWidth: 3, borderLeftColor: theme.colors.warn,
    },

    totalLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.ink },
    totalValue: { fontSize: 18, fontWeight: '800', color: theme.colors.accent },

    suggestBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.warnSoft,
      padding: 10, borderRadius: 8,
    },
    suggestText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },
  });
}
