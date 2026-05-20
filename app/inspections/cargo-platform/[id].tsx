import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { Button } from '../../../components/ui';
import { DateTimeField } from '../../../components/DateTimeField';
import { ProjectPickerStep } from '../../../components/inspections';
import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';
import { FlowHeader } from '../../../components/FlowHeader';
import { InspectionResultView } from '../../../components/InspectionResultView';
import {
  ChecklistSection,
  DynamicTable,
  SignatureSheet,
  VerdictSelector,
  PhotoSection,
} from '../../../components/inspection';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cargoPlatformApi } from '../../../lib/cargoPlatformService';
import { projectsApi } from '../../../lib/services';
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
import { CelebrationBurst } from '../../../components/animations';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  type CPResult,
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
const TOTAL_STEPS     = 5;
const STEP_LABELS     = ['ინფო', 'პლატფ.', 'ტვირთი', 'შემოწ.', 'დასკვნა'];

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


  const [inspection, setInspection] = useState<CargoPlatformInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  // Step state
  const [step, setStep] = useState(INFO_STEP);
  const prevStepRef = useRef(INFO_STEP);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<CargoPlatformInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

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
          }).catch(() => {});
        }

        if (insp.status !== 'completed') {
          const saved = await AsyncStorage.getItem(persistKey);
          if (saved && !cancelled) {
            const s = parseInt(saved, 10);
            if (!isNaN(s) && s >= INFO_STEP && s <= CONCLUSION_STEP) setStep(s);
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
    if (step >= INFO_STEP && step <= CONCLUSION_STEP) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey]);

  useEffect(() => {
    return () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); };
  }, []);

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

  const handleCargoChange = useCallback((rows: Record<string, any>[]) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, cargo: rows as typeof prev.cargo };
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

  // ── Signatories ─────────────────────────────────────────────────────────────

  const handleSignatoryChange = useCallback((idx: number, field: string, value: string) => {
    setInspection(prev => {
      if (!prev) return prev;
      const sigs = [...prev.signatures] as [CPSignatory, CPSignatory];
      sigs[idx] = { ...sigs[idx], [field]: field === 'signature' ? (value || null) : value };
      return { ...prev, signatures: sigs };
    });
  }, []);

  const handleSignatorySign = useCallback((idx: number, base64Png: string) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    const sigs = [...insp.signatures] as [CPSignatory, CPSignatory];
    sigs[idx] = { ...sigs[idx], signature: base64Png, date: new Date().toISOString() };
    setInspection({ ...insp, signatures: sigs });
  }, []);

  // ── Verdict auto-suggest ────────────────────────────────────────────────────

  const suggestedVerdict = useMemo(
    () => inspection ? computeCPVerdictSuggestion(inspection.items) : null,
    [inspection?.items],
  );

  // ── PDF ─────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    const insp = inspectionRef.current;
    if (!insp) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await buildCargoPlatformPdfHtml({ inspection: insp, projectName: projectName || 'პროექტი' });
      const pdfName = generatePdfName(
        projectName || 'project',
        'CargoPlatformInspection',
        new Date(insp.inspectionDate),
        insp.id,
      );
      const uid = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, uid, {
        title: 'ტვირთის მიმღები პლატფორმის შემოწმება',
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
      const html = await buildCargoPlatformPdfHtml({ inspection: insp, projectName: projectName || 'პროექტი' });
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
    if (!inspection.verdict)                missing.push('დასკვნა');
    if (!inspection.verdictComment?.trim()) missing.push('კომენტარი');

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
      setCelebrating(true);
      haptic.inspectionComplete();
      celebrationTimer.current = setTimeout(() => setCelebrating(false), 2000);
    } catch (e) {
      toast.error(friendlyError(e, 'შეცდომა'));
      return false;
    } finally {
      setCompleting(false);
    }
  }, [inspection, persistKey, toast]);

  // ── Step navigation ──────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === INFO_STEP) return !!(inspection.company?.trim() && inspection.address?.trim());
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !!inspection.verdictComment?.trim() && !completing;
    return true;
  }, [step, inspection, completing]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
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

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ტვირთის მიმღები პლატფორმა"
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
        flowTitle="პლატფორმის შემოწმება"
        project={projectName ? { name: projectName } : null}
        step={step + 1}
        totalSteps={TOTAL_STEPS}
        stepLabels={STEP_LABELS}
        leading="back"
        trailing="close"
        onClose={() => router.back()}
        trailingElement={
          step > INFO_STEP ? (
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

          {/* ── Step 0: Project picker ───────────────────────────────────────── */}
          {step === INFO_STEP && (
            <ProjectPickerStep
              selectedId={inspection.projectId}
              onSelect={p => {
                setProjectName(p.company_name || p.name);
                setInspection(prev => prev ? {
                  ...prev,
                  projectId: p.id,
                  company: p.company_name || p.name,
                  address: p.address ?? prev.address,
                } : prev);
              }}
            />
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
                label="სართული / ზონა"
                value={inspection.floorZone}
                onChangeText={v => update('floorZone', v)}
              />

              <DateTimeField
                label="შემოწმების თარიღი"
                value={new Date(inspection.inspectionDate)}
                onChange={d => update('inspectionDate', d.toISOString().slice(0, 10))}
                mode="date"
              />

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

              <DynamicTable
                columns={[
                  { key: 'name', label: 'ტვირთის დასახელება', type: 'text' },
                  { key: 'total_weight_kg', label: 'სრული წონა (კგ)', type: 'number', keyboardType: 'decimal-pad' },
                ]}
                rows={inspection.cargo}
                onChange={handleCargoChange}
                onBuildDefaultRow={buildDefaultCargoRow}
                minRows={0}
                footer={
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.totalLabel}>სულ:</Text>
                    <Text style={styles.totalValue}>{cpTotalWeight(inspection.cargo)} კგ</Text>
                  </View>
                }
              />
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
                <ChecklistSection
                  key={section}
                  title={label}
                  items={entries.map(e => {
                    const state = inspection.items.find(i => i.id === e.id)
                      ?? { id: e.id, result: null, comment: null, photo_paths: [] };
                    return {
                      id: e.id,
                      label: e.label,
                      description: e.description,
                      type: 'three_state' as const,
                      options: { a: 'good', b: 'fix', c: 'N/A', cIsNeutral: true },
                      value: state.result === 'na' ? 'N/A' : state.result,
                      comment: state.comment,
                      photoPaths: state.photo_paths ?? [],
                    };
                  })}
                  onItemChange={(id, field, val) => {
                    if (field === 'value') {
                      const result: CPResult | null = val === 'N/A' ? 'na' : val as CPResult | null;
                      updateItem(id, { result });
                    } else {
                      updateItem(id, { comment: val });
                    }
                  }}
                  onAddPhoto={handleAddItemPhoto}
                  onDeletePhoto={handleDeleteItemPhoto}
                />
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
              <VerdictSelector
                options={[
                  { value: 'approved', label: CP_VERDICT_LABEL.approved, type: 'success' },
                  { value: 'conditional', label: CP_VERDICT_LABEL.conditional, type: 'warning' },
                  { value: 'rejected', label: CP_VERDICT_LABEL.rejected, type: 'danger' },
                ]}
                value={inspection.verdict}
                onChange={v => update('verdict', v as CPVerdict)}
                note={inspection.verdictComment}
                onNoteChange={v => update('verdictComment', v)}
                notePlaceholder="კომენტარი *"
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

    twoCol: { flexDirection: 'row', gap: 8 },
    colHalf: { flex: 1 },

    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    sectionHint: { fontSize: 12, color: theme.colors.inkSoft, fontStyle: 'italic', lineHeight: 18 },

    // Binary pills (platform guardrail selectors)
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

    // Cargo total
    totalLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.ink },
    totalValue: { fontSize: 18, fontWeight: '800', color: theme.colors.accent },

    // Verdict suggestion banner
    suggestBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.warnSoft,
      padding: 10, borderRadius: 8,
    },
    suggestText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },
  });
}
