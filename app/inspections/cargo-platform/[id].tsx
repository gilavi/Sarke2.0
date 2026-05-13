import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { Button } from '../../../components/ui';
import { DateTimeField } from '../../../components/DateTimeField';
import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';
import { FlowHeader } from '../../../components/FlowHeader';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { CargoPlatformChecklistItem } from '../../../components/cargoPlatform/CargoPlatformChecklistItem';
import { CargoRow } from '../../../components/cargoPlatform/CargoRow';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cargoPlatformApi } from '../../../lib/cargoPlatformService';
import { projectsApi } from '../../../lib/services';
import { imageForDisplay } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { buildCargoPlatformPdfHtml } from '../../../lib/cargoPlatformPdf';
import { generateAndSharePdf, PdfLimitReachedError } from '../../../lib/pdfOpen';
import { PaywallModal } from '../../../components/PaywallModal';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { usePdfUsage, useInvalidatePdfUsage } from '../../../lib/usePdfUsage';
import { generatePdfName } from '../../../lib/pdfName';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { haptic } from '../../../lib/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFieldHistory } from '../../../hooks/useFieldHistory';
import { SuggestionPills } from '../../../components/SuggestionPills';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';
import {
  CP_ITEMS,
  CP_SECTION_LABELS,
  CP_VERDICT_LABEL,
  CARGO_PLATFORM_TEMPLATE_ID,
  buildDefaultCargoRow,
  computeCPVerdictSuggestion,
  cpTotalWeight,
  type CargoPlatformInspection,
  type CPVerdict,
  type CPItemState,
  type CPSignatory,
  type CPSection,
} from '../../../types/cargoPlatform';

// ── Step constants ────────────────────────────────────────────────────────────
const INFO_STEP       = 0;
const PLATFORM_STEP   = 1;
const CARGO_STEP      = 2;
const CHECKLIST_STEP  = 3;
const CONCLUSION_STEP = 4;
const SIGNATURES_STEP = 5;
const TOTAL_STEPS     = 6;
const STEP_LABELS     = ['ინფო', 'პლატფ.', 'ტვირთი', 'შემოწ.', 'დასკვნა', 'ხელმ.'];

// ── Signature canvas styles (same as briefings) ───────────────────────────────
const WEB_STYLE = `
  html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #fff; overflow: hidden; }
  .m-signature-pad { position: fixed; top: 0; left: 0; right: 0; bottom: 0; box-shadow: none; border: none; background: #fff; margin: 0; }
  .m-signature-pad--body { border: none; height: 100%; }
  .m-signature-pad--body canvas { width: 100% !important; height: 100% !important; background: #fff; }
  .m-signature-pad--footer { display: none; }
`;

// ── Binary pill selector ──────────────────────────────────────────────────────
function BinaryPills<T extends string>({
  value,
  options,
  onSelect,
  styles,
  theme,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onSelect: (v: T | null) => void;
  styles: ReturnType<typeof getstyles>;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.pillRow}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => {
              haptic.light();
              onSelect(active ? null : opt.value);
            }}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CargoPlatformInspectionScreen() {
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

  const userId = session?.state?.status === 'signedIn' ? session.state.session.user.id : null;

  const companyHistory = useFieldHistory(userId, 'cp:company');
  const addressHistory = useFieldHistory(userId, 'cp:address');

  const [inspection, setInspection] = useState<CargoPlatformInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Step state
  const [step, setStep] = useState(INFO_STEP);
  const prevStepRef = useRef(INFO_STEP);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<CargoPlatformInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  // Sequential signing state: 0 = first signatory, 1 = second
  const [sigPhase, setSigPhase] = useState<0 | 1>(0);
  const [hasStroke, setHasStroke] = useState(false);
  const [sigSaving, setSigSaving] = useState(false);
  const canvasRef = useRef<SignatureViewRef>(null);

  const persistKey = useMemo(() => `cargo-platform-wizard:${id}:step`, [id]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const insp = await cargoPlatformApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        let patched = insp;
        if (!insp.inspectorName && session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name) {
            patched = { ...patched, inspectorName: name };
            // Patch first signatory name too if empty
            const sigs = [...patched.signatures] as [CPSignatory, CPSignatory];
            if (!sigs[0].name) sigs[0] = { ...sigs[0], name };
            patched = { ...patched, signatures: sigs };
          }
        }
        if (patched.inspectorName !== insp.inspectorName) {
          cargoPlatformApi.patch(patched.id, {
            inspectorName: patched.inspectorName,
            signatures: patched.signatures,
          }).catch(() => {});
        }

        if (insp.status !== 'completed') {
          const saved = await AsyncStorage.getItem(persistKey);
          if (saved && !cancelled) {
            const s = parseInt(saved, 10);
            if (!isNaN(s) && s >= INFO_STEP && s <= SIGNATURES_STEP) setStep(s);
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
              cargoPlatformApi.patch(patched.id, {
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
    if (step >= INFO_STEP && step <= SIGNATURES_STEP) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey]);

  // ── Auto-save (debounced) ───────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: CargoPlatformInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      cargoPlatformApi.patch(insp.id, {
        company: insp.company,
        address: insp.address,
        inspectorName: insp.inspectorName,
        floorZone: insp.floorZone,
        inspectionDate: insp.inspectionDate,
        platformTypeModel: insp.platformTypeModel,
        platformLength: insp.platformLength,
        platformWidth: insp.platformWidth,
        platformColorDesc: insp.platformColorDesc,
        sideGuardrail: insp.sideGuardrail,
        frontGuardrail: insp.frontGuardrail,
        guardrailHeight: insp.guardrailHeight,
        cargo: insp.cargo,
        items: insp.items,
        verdict: insp.verdict,
        verdictComment: insp.verdictComment,
        summaryPhotos: insp.summaryPhotos,
        signatures: insp.signatures,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof CargoPlatformInspection>(
    key: K,
    value: CargoPlatformInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Cargo rows ─────────────────────────────────────────────────────────────

  const addCargoRow = useCallback(() => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, cargo: [...prev.cargo, buildDefaultCargoRow()] };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateCargoRow = useCallback((index: number, patch: Parameters<typeof CargoRow>[0]['onChange'] extends (p: infer P) => void ? P : never) => {
    setInspection(prev => {
      if (!prev) return prev;
      const cargo = prev.cargo.map((r, i) => i === index ? { ...r, ...patch } : r);
      const next = { ...prev, cargo };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const removeCargoRow = useCallback((index: number) => {
    setInspection(prev => {
      if (!prev) return prev;
      const cargo = prev.cargo.filter((_, i) => i !== index);
      const next = { ...prev, cargo };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Checklist items ─────────────────────────────────────────────────────────

  const updateItem = useCallback((
    itemId: number,
    patch: Partial<Pick<CPItemState, 'result' | 'comment'>>,
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i => i.id === itemId ? { ...i, ...patch } : i);
      const next = { ...prev, items };
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
      const path = await cargoPlatformApi.uploadPhoto(insp.id, itemId, result.uri);
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
      await cargoPlatformApi.deletePhoto(path);
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
      const path = await cargoPlatformApi.uploadPhoto(insp.id, 'summary', result.uri);
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
      await cargoPlatformApi.deletePhoto(path);
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

  // ── Verdict auto-suggest ────────────────────────────────────────────────────

  const suggestedVerdict = useMemo(
    () => inspection ? computeCPVerdictSuggestion(inspection.items) : null,
    [inspection?.items],
  );

  // ── PDF ─────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await buildCargoPlatformPdfHtml({ inspection, projectName: projectName || 'პროექტი' });
      const pdfName = generatePdfName(
        projectName || 'project',
        'CargoPlatformInspection',
        new Date(inspection.inspectionDate),
        inspection.id,
      );
      const uid = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, uid, {
        title: 'ტვირთის მიმღები პლატფორმის შემოწმება',
        author: inspection.inspectorName || undefined,
        documentId: inspection.id,
        subject: 'შრომის უსაფრთხოება',
      });
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [inspection, projectName, session.state, invalidatePdfUsage, toast, pdfUsage]);

  // ── Preview (completed) ─────────────────────────────────────────────────────

  const buildPreview = useCallback(async () => {
    if (!inspection) return;
    setPreviewBusy(true);
    try {
      const html = await buildCargoPlatformPdfHtml({ inspection, projectName: projectName || 'პროექტი' });
      setPreviewHtml(html);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setPreviewBusy(false);
    }
  }, [inspection, projectName, toast]);

  useEffect(() => {
    if (inspection?.status === 'completed') void buildPreview();
  }, [inspection?.status]);

  // ── Signing (sequential) ────────────────────────────────────────────────────

  // Reset canvas when phase changes
  useEffect(() => {
    setHasStroke(false);
    const t = setTimeout(() => canvasRef.current?.clearSignature(), 80);
    return () => clearTimeout(t);
  }, [sigPhase]);

  const handleSignConfirm = useCallback(() => {
    if (!hasStroke) return;
    canvasRef.current?.readSignature();
  }, [hasStroke]);

  const handleSignClear = useCallback(() => {
    canvasRef.current?.clearSignature();
    setHasStroke(false);
  }, []);

  const handleSignOK = useCallback(async (sig: string) => {
    if (!inspection) return;
    setSigSaving(true);
    try {
      const b64 = sig.replace(/^data:image\/png;base64,/, '');
      const sigs = [...inspection.signatures] as [CPSignatory, CPSignatory];
      sigs[sigPhase] = {
        ...sigs[sigPhase],
        signature: b64,
        date: new Date().toISOString(),
      };
      const next = { ...inspection, signatures: sigs };
      setInspection(next);
      await cargoPlatformApi.patch(inspection.id, { signatures: sigs });

      if (sigPhase === 0) {
        // Move to second signatory
        setSigPhase(1);
      }
      // If sigPhase === 1 — both done, Complete button will be enabled
    } catch (e) {
      toast.error(friendlyError(e, 'ხელმოწერა ვერ შეინახა'));
    } finally {
      setSigSaving(false);
    }
  }, [inspection, sigPhase, toast]);

  const handleClearSignature = useCallback((idx: 0 | 1) => {
    if (!inspection) return;
    const sigs = [...inspection.signatures] as [CPSignatory, CPSignatory];
    sigs[idx] = { ...sigs[idx], signature: null, date: null };
    const next = { ...inspection, signatures: sigs };
    setInspection(next);
    cargoPlatformApi.patch(inspection.id, { signatures: sigs }).catch(() => {});
    setSigPhase(idx);
  }, [inspection]);

  // ── Complete ────────────────────────────────────────────────────────────────

  const bothSigned = !!(inspection?.signatures[0].signature && inspection?.signatures[1].signature);

  const handleComplete = useCallback(async () => {
    if (!inspection) return;
    const missing: string[] = [];
    if (!inspection.company?.trim())        missing.push('კომპანიის დასახელება');
    if (!inspection.address?.trim())        missing.push('მდებარეობა / მისამართი');
    if (!inspection.verdict)                missing.push('დასკვნა');
    if (!inspection.verdictComment?.trim()) missing.push('კომენტარი');
    if (!bothSigned)                        missing.push('ორივე ხელმომწერის ხელმოწერა');

    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }

    setCompleting(true);
    try {
      await cargoPlatformApi.patch(inspection.id, {
        company: inspection.company,
        address: inspection.address,
        inspectorName: inspection.inspectorName,
        floorZone: inspection.floorZone,
        inspectionDate: inspection.inspectionDate,
        platformTypeModel: inspection.platformTypeModel,
        platformLength: inspection.platformLength,
        platformWidth: inspection.platformWidth,
        platformColorDesc: inspection.platformColorDesc,
        sideGuardrail: inspection.sideGuardrail,
        frontGuardrail: inspection.frontGuardrail,
        guardrailHeight: inspection.guardrailHeight,
        cargo: inspection.cargo,
        items: inspection.items,
        verdict: inspection.verdict,
        verdictComment: inspection.verdictComment,
        summaryPhotos: inspection.summaryPhotos,
        signatures: inspection.signatures,
      });
      await cargoPlatformApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:${CARGO_PLATFORM_TEMPLATE_ID}`,
      ).catch(() => {});
      setInspection(prev => prev ? { ...prev, status: 'completed', completedAt } : prev);
      await AsyncStorage.removeItem(persistKey);
      toast.success('შემოწმება დასრულდა');
    } catch (e) {
      toast.error(friendlyError(e, 'შეცდომა'));
    } finally {
      setCompleting(false);
    }
  }, [inspection, bothSigned, persistKey, toast]);

  // ── Step navigation ──────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === INFO_STEP) return !!(inspection.company?.trim() && inspection.address?.trim());
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !!inspection.verdictComment?.trim();
    if (step === SIGNATURES_STEP) return bothSigned && !completing;
    return true;
  }, [step, inspection, bothSigned, completing]);

  const handleNext = useCallback(async () => {
    if (step === SIGNATURES_STEP) {
      await handleComplete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, handleComplete]);

  const handlePrev = useCallback(async () => {
    if (step === INFO_STEP) {
      await AsyncStorage.removeItem(persistKey);
      router.back();
    } else {
      setStep(s => s - 1);
    }
  }, [step, persistKey, router]);

  // ── Section grouping for checklist ──────────────────────────────────────────

  const checklistSections = useMemo(() => {
    const sections: CPSection[] = ['A', 'B'];
    return sections.map(sec => ({
      section: sec,
      label: CP_SECTION_LABELS[sec],
      entries: CP_ITEMS.filter(e => e.section === sec),
    }));
  }, []);

  // ── Loading & completed ─────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'პლატფორმის შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  if (inspection.status === 'completed') {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ტვირთის მიმღები პლატფორმა"
        requiredSignerRoles={[]}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        signedCount={0}
        totalSlots={0}
        attachmentCount={0}
        pdfLocked={pdfUsage?.isLocked}
        downloading={generatingPdf}
        paywallVisible={paywallVisible}
        onPaywallClose={() => setPaywallVisible(false)}
        onDownloadPdf={() => void handlePdf()}
        onSheetSaved={() => void buildPreview()}
      />
    );
  }

  const currentSignatoryIdx = sigPhase;
  const currentSignatory = inspection.signatures[currentSignatoryIdx];
  const isCurrentSigned = !!currentSignatory.signature;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle="პლატფორმის შემოწმება"
        project={projectName ? { name: projectName } : null}
        step={step + 1}
        totalSteps={TOTAL_STEPS}
        leading="back"
        trailing="close"
        onClose={() => router.back()}
        trailingElement={
          step > 0 ? (
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
          ) : null
        }
        onBack={handlePrev}
        backDisabled={false}
      />

      {saving && <Text style={styles.savingHint}>შენახვა…</Text>}

      {pdfUsage?.isLocked && <PdfLockedBanner onSubscribe={() => setPaywallVisible(true)} />}

      <View style={{ flex: 1 }}>
        <WizardStepTransition stepKey={step} direction={direction} animate={animateSteps}>

          {/* ── Step 0: General Info ─────────────────────────────────────────── */}
          {step === INFO_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <FloatingLabelInput
                label="კომპანიის დასახელება *"
                value={inspection.company}
                onChangeText={v => update('company', v)}
                onFocus={() => setFocusedField('company')}
                onBlur={() => {
                  setFocusedField(null);
                  if (inspection.company?.trim()) companyHistory.addToHistory(inspection.company.trim());
                }}
                required
              />
              <SuggestionPills
                suggestions={companyHistory.suggestions}
                onSelect={v => { update('company', v); setFocusedField(null); }}
                visible={focusedField === 'company' || (!inspection.company?.trim() && companyHistory.suggestions.length > 0)}
              />

              <FloatingLabelInput
                label="მდებარეობა / მისამართი *"
                value={inspection.address}
                onChangeText={v => update('address', v)}
                onFocus={() => setFocusedField('address')}
                onBlur={() => {
                  setFocusedField(null);
                  if (inspection.address?.trim()) addressHistory.addToHistory(inspection.address.trim());
                }}
                required
              />
              <SuggestionPills
                suggestions={addressHistory.suggestions}
                onSelect={v => { update('address', v); setFocusedField(null); }}
                visible={focusedField === 'address' || (!inspection.address?.trim() && addressHistory.suggestions.length > 0)}
              />

              <FloatingLabelInput
                label="შემოწმების ჩამტარებელი"
                value={inspection.inspectorName}
                onChangeText={v => update('inspectorName', v)}
              />

              <FloatingLabelInput
                label="სართული / ზონა"
                value={inspection.floorZone}
                onChangeText={v => update('floorZone', v)}
              />

              <DateTimeField
                label="შემოწმების თარიღი *"
                value={new Date(inspection.inspectionDate)}
                onChange={d => update('inspectionDate', d.toISOString().slice(0, 10))}
                mode="date"
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 1: Platform ID ──────────────────────────────────────────── */}
          {step === PLATFORM_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <FloatingLabelInput
                label="პლატფორმის ტიპი / მოდელი"
                value={inspection.platformTypeModel}
                onChangeText={v => update('platformTypeModel', v)}
              />

              <View style={styles.twoCol}>
                <View style={styles.colHalf}>
                  <FloatingLabelInput
                    label="სიგრძე (მ)"
                    value={inspection.platformLength != null ? String(inspection.platformLength) : ''}
                    onChangeText={v => {
                      const n = parseFloat(v);
                      update('platformLength', isNaN(n) ? null : n);
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.colHalf}>
                  <FloatingLabelInput
                    label="სიგანე (მ)"
                    value={inspection.platformWidth != null ? String(inspection.platformWidth) : ''}
                    onChangeText={v => {
                      const n = parseFloat(v);
                      update('platformWidth', isNaN(n) ? null : n);
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <FloatingLabelInput
                label="ვიზუალური აღწერა / ფერი"
                value={inspection.platformColorDesc}
                onChangeText={v => update('platformColorDesc', v)}
              />

              <View style={styles.binaryGroup}>
                <Text style={styles.fieldLabel}>გვერდის დამცავი მოაჯირი</Text>
                <BinaryPills
                  value={inspection.sideGuardrail}
                  options={[{ value: 'none', label: 'არ გააჩნია' }, { value: 'complete', label: 'მოაჯირი სრულია' }]}
                  onSelect={v => update('sideGuardrail', v)}
                  styles={styles}
                  theme={theme}
                />
              </View>

              <View style={styles.binaryGroup}>
                <Text style={styles.fieldLabel}>წინა დამცავი მოაჯირი</Text>
                <BinaryPills
                  value={inspection.frontGuardrail}
                  options={[{ value: 'none', label: 'არ გააჩნია' }, { value: 'complete', label: 'მოაჯირი სრულია' }]}
                  onSelect={v => update('frontGuardrail', v)}
                  styles={styles}
                  theme={theme}
                />
              </View>

              <View style={styles.binaryGroup}>
                <Text style={styles.fieldLabel}>მოაჯირის სიმაღლე (სტანდ. 90–120 სმ)</Text>
                <BinaryPills
                  value={inspection.guardrailHeight}
                  options={[
                    { value: 'non_standard', label: 'ვერ აკმ. სტანდარტს' },
                    { value: 'standard', label: 'სტანდარტს აკმ.' },
                  ]}
                  onSelect={v => update('guardrailHeight', v)}
                  styles={styles}
                  theme={theme}
                />
              </View>
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Cargo table ──────────────────────────────────────────── */}
          {step === CARGO_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[styles.stepBody, { paddingHorizontal: 16 }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <Text style={styles.sectionHint}>
                ყველა ტვირთი, რომელიც განთავსდება პლატფორმაზე, ექვემდებარება იდენტიფიკაციას და წინასწარ წონის დადასტურებას
              </Text>

              {inspection.cargo.map((row, idx) => (
                <CargoRow
                  key={row.id}
                  index={idx}
                  row={row}
                  canDelete={inspection.cargo.length > 0}
                  onChange={patch => updateCargoRow(idx, patch)}
                  onDelete={() => removeCargoRow(idx)}
                />
              ))}

              <Pressable style={styles.addRowBtn} onPress={addCargoRow} {...a11y('ტვირთის დამატება', undefined, 'button')}>
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
                <Text style={styles.addRowText}>+ ტვირთის დამატება</Text>
              </Pressable>

              {/* Total weight */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>სულ:</Text>
                <Text style={styles.totalValue}>{cpTotalWeight(inspection.cargo)} კგ</Text>
              </View>
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 3: Checklist ────────────────────────────────────────────── */}
          {step === CHECKLIST_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 4 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              {checklistSections.map(({ section, label, entries }) => (
                <View key={section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{label}</Text>
                  </View>
                  {entries.map(entry => {
                    const state = inspection.items.find(i => i.id === entry.id)
                      ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
                    return (
                      <CargoPlatformChecklistItem
                        key={entry.id}
                        entry={entry}
                        state={state}
                        onChange={patch => updateItem(entry.id, patch)}
                        onAddPhoto={() => handleAddItemPhoto(entry.id)}
                        onDeletePhoto={path => handleDeleteItemPhoto(entry.id, path)}
                      />
                    );
                  })}
                </View>
              ))}
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 4: Conclusion ───────────────────────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              {/* Auto-suggest banner */}
              {suggestedVerdict && inspection.verdict !== suggestedVerdict && (
                <Pressable
                  style={styles.suggestBanner}
                  onPress={() => update('verdict', suggestedVerdict)}
                >
                  <Ionicons name="bulb-outline" size={16} color={theme.colors.warn} />
                  <Text style={styles.suggestText}>
                    შემოთავაზება: {CP_VERDICT_LABEL[suggestedVerdict]}
                  </Text>
                </Pressable>
              )}

              <Text style={styles.fieldLabel}>დასკვნა *</Text>
              <View style={styles.chipRow}>
                {(['approved', 'conditional', 'rejected'] as CPVerdict[]).map(v => {
                  const active = inspection.verdict === v;
                  return (
                    <Pressable
                      key={v}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => update('verdict', active ? null : v)}
                      {...a11y(CP_VERDICT_LABEL[v], undefined, 'radio')}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {CP_VERDICT_LABEL[v]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <FloatingLabelInput
                label="კომენტარი *"
                value={inspection.verdictComment}
                onChangeText={v => update('verdictComment', v)}
                multiline
                numberOfLines={4}
                required
              />

              <Text style={styles.fieldLabel}>ფოტო / ვიდეო მასალა (სურვ.)</Text>
              <SummaryPhotoStrip
                paths={inspection.summaryPhotos}
                onAdd={handleAddSummaryPhoto}
                onDelete={handleDeleteSummaryPhoto}
                styles={styles}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 5: Signatures (sequential) ─────────────────────────────── */}
          {step === SIGNATURES_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              {/* Progress dots */}
              <View style={styles.sigProgress}>
                {([0, 1] as const).map(i => {
                  const signed = !!inspection.signatures[i].signature;
                  const current = !signed && i === sigPhase;
                  return (
                    <View key={i} style={[styles.sigDot, signed && styles.sigDotSigned, current && styles.sigDotCurrent]}>
                      {signed && <Ionicons name="checkmark" size={12} color={theme.colors.white} />}
                      {!signed && <Text style={styles.sigDotText}>{i + 1}</Text>}
                    </View>
                  );
                })}
                <View style={styles.sigDotLine} />
              </View>

              <Text style={styles.sigTitle}>
                {currentSignatoryIdx === 0 ? 'I ხელმომწერი' : 'II ხელმომწერი'}
              </Text>

              {/* Signatory fields */}
              <FloatingLabelInput
                label="სახელი, გვარი"
                value={currentSignatory.name}
                onChangeText={v => {
                  const sigs = [...inspection.signatures] as [CPSignatory, CPSignatory];
                  sigs[currentSignatoryIdx] = { ...sigs[currentSignatoryIdx], name: v };
                  update('signatures', sigs);
                }}
              />
              <FloatingLabelInput
                label="თანამდებობა"
                value={currentSignatory.position}
                onChangeText={v => {
                  const sigs = [...inspection.signatures] as [CPSignatory, CPSignatory];
                  sigs[currentSignatoryIdx] = { ...sigs[currentSignatoryIdx], position: v };
                  update('signatures', sigs);
                }}
              />
              <FloatingLabelInput
                label="ორგანიზაცია"
                value={currentSignatory.organization}
                onChangeText={v => {
                  const sigs = [...inspection.signatures] as [CPSignatory, CPSignatory];
                  sigs[currentSignatoryIdx] = { ...sigs[currentSignatoryIdx], organization: v };
                  update('signatures', sigs);
                }}
              />

              {/* Signature canvas or signed preview */}
              {isCurrentSigned ? (
                <View style={styles.signedCard}>
                  <View style={styles.signedHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.semantic.success} />
                    <Text style={styles.signedLabel}>ხელმოწერილია</Text>
                    <Pressable onPress={() => handleClearSignature(currentSignatoryIdx)} hitSlop={8}>
                      <Text style={styles.clearSigText}>გასუფთავება</Text>
                    </Pressable>
                  </View>
                  <SignedPreview sig={currentSignatory.signature!} styles={styles} />

                  {currentSignatoryIdx === 0 && !inspection.signatures[1].signature && (
                    <Pressable style={styles.nextSignerBtn} onPress={() => setSigPhase(1)}>
                      <Text style={styles.nextSignerBtnText}>II ხელმომწერის ხელმოწერა →</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>ხელმოწერა</Text>
                  <View style={styles.canvasContainer}>
                    <SignatureScreen
                      ref={canvasRef}
                      onOK={handleSignOK}
                      onBegin={() => setHasStroke(true)}
                      webStyle={WEB_STYLE}
                      androidLayerType="hardware"
                    />
                  </View>
                  <View style={styles.sigActions}>
                    <Pressable style={styles.sigClearBtn} onPress={handleSignClear} disabled={!hasStroke}>
                      <Text style={[styles.sigClearText, !hasStroke && { opacity: 0.4 }]}>გასუფთავება</Text>
                    </Pressable>
                    <Button
                      title={sigSaving ? 'ინახება…' : 'დადასტურება'}
                      loading={sigSaving}
                      disabled={!hasStroke || sigSaving}
                      onPress={handleSignConfirm}
                    />
                  </View>
                </>
              )}
            </KeyboardAwareScrollView>
          )}

        </WizardStepTransition>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          {step === SIGNATURES_STEP ? (
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
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SignedPreview({ sig, styles }: { sig: string; styles: ReturnType<typeof getstyles> }) {
  return (
    <View style={styles.signedImgBox}>
      <Image
        source={{ uri: `data:image/png;base64,${sig}` }}
        style={styles.signedImg}
        contentFit="contain"
      />
    </View>
  );
}

function SummaryPhotoStrip({
  paths, onAdd, onDelete, styles,
}: {
  paths: string[];
  onAdd: () => void;
  onDelete: (path: string) => void;
  styles: ReturnType<typeof getstyles>;
}) {
  const { theme } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
      {paths.map(path => <SummaryThumb key={path} path={path} onDelete={() => onDelete(path)} styles={styles} />)}
      <Pressable style={styles.addPhoto} onPress={onAdd} {...a11y('ფოტოს დამატება', undefined, 'button')}>
        <Ionicons name="camera-outline" size={20} color={theme.colors.inkSoft} />
        <Text style={styles.addPhotoLabel}>+ ფოტო</Text>
      </Pressable>
    </ScrollView>
  );
}

const SummaryThumb = memo(function SummaryThumb({
  path, onDelete, styles,
}: { path: string; onDelete: () => void; styles: ReturnType<typeof getstyles> }) {
  const { theme } = useTheme();
  const [uri, setUri] = useState('');
  useEffect(() => {
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, path).then(u => { if (!cancelled) setUri(u); }).catch(() => {});
    return () => { cancelled = true; };
  }, [path]);
  return (
    <View style={styles.thumb}>
      <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" />
      <Pressable style={styles.thumbDelete} onPress={onDelete} hitSlop={8} {...a11y('ფოტოს წაშლა', undefined, 'button')}>
        <Ionicons name="close-circle" size={18} color={theme.colors.white} />
      </Pressable>
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 24, paddingTop: 4 },
    stepBody: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 },
    footer: { gap: 10, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, backgroundColor: theme.colors.card },

    twoCol: { flexDirection: 'row', gap: 8 },
    colHalf: { flex: 1 },

    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    sectionHint: { fontSize: 12, color: theme.colors.inkSoft, fontStyle: 'italic', lineHeight: 18 },

    // Binary pills
    binaryGroup: { gap: 6 },
    pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    pill: {
      paddingHorizontal: 16, paddingVertical: 10,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: theme.colors.hairline, backgroundColor: theme.colors.card,
    },
    pillActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
    pillText: { fontSize: 13, color: theme.colors.inkSoft },
    pillTextActive: { color: theme.colors.accent, fontWeight: '700' },

    // Cargo
    addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
    addRowText: { fontSize: 13, color: theme.colors.accent, fontWeight: '600' },
    totalRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, paddingHorizontal: 12,
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 10, marginTop: 4,
    },
    totalLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.ink },
    totalValue: { fontSize: 18, fontWeight: '800', color: theme.colors.accent },

    // Checklist sections
    sectionHeader: {
      paddingVertical: 8, paddingHorizontal: 12,
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 8, marginBottom: 4, marginTop: 8,
    },
    sectionHeaderText: { fontSize: 12, fontWeight: '700', color: theme.colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Verdict
    suggestBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.warnSoft,
      padding: 10, borderRadius: 8,
    },
    suggestText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    typeChip: {
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    typeChipActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
    typeChipText: { fontSize: 13, color: theme.colors.inkSoft },
    typeChipTextActive: { color: theme.colors.accent, fontWeight: '700' },

    // Photos
    photoStrip: { gap: 8, paddingVertical: 4 },
    addPhoto: {
      width: 64, height: 64, borderRadius: 8,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.hairline,
      alignItems: 'center', justifyContent: 'center', gap: 2,
    },
    addPhotoLabel: { fontSize: 11, color: theme.colors.inkSoft },
    thumb: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
    thumbImg: { width: 64, height: 64 },
    thumbDelete: { position: 'absolute', top: 2, right: 2 },

    // Signatures
    sigProgress: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, position: 'relative' },
    sigDotLine: {
      position: 'absolute', left: 22, right: 22, height: 2,
      backgroundColor: theme.colors.hairline, zIndex: -1,
    },
    sigDot: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: theme.colors.subtleSurface,
      borderWidth: 2, borderColor: theme.colors.hairline,
      alignItems: 'center', justifyContent: 'center',
    },
    sigDotSigned: { backgroundColor: theme.colors.semantic.success, borderColor: theme.colors.semantic.success },
    sigDotCurrent: { borderColor: theme.colors.accent },
    sigDotText: { fontSize: 13, fontWeight: '700', color: theme.colors.inkSoft },
    sigTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.ink, marginBottom: 8 },
    canvasContainer: {
      height: 200, borderRadius: 10, overflow: 'hidden',
      borderWidth: 1, borderColor: theme.colors.hairline,
      backgroundColor: '#fff',
    },
    sigActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    sigClearBtn: { paddingVertical: 8 },
    sigClearText: { fontSize: 14, color: theme.colors.accent },
    signedCard: {
      borderRadius: 10, borderWidth: 1, borderColor: theme.colors.semantic.success,
      overflow: 'hidden', backgroundColor: theme.colors.semantic.successSoft,
    },
    signedHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.semantic.success,
    },
    signedLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.semantic.success },
    clearSigText: { fontSize: 13, color: theme.colors.inkSoft },
    signedImgBox: { height: 100, alignItems: 'center', justifyContent: 'center', padding: 8 },
    signedImg: { width: '100%', height: '100%' },
    nextSignerBtn: {
      margin: 12, padding: 12, borderRadius: 8,
      backgroundColor: theme.colors.accent, alignItems: 'center',
    },
    nextSignerBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.white },
  });
}
