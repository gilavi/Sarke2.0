import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Button } from '../../../components/ui';
import { DateTimeField } from '../../../components/DateTimeField';
import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';
import { FlowHeader } from '../../../components/FlowHeader';
import { InspectionResultView } from '../../../components/InspectionResultView';
import {
  ChecklistSection,
  SignatureSheet,
  VerdictSelector,
  IdentificationGrid,
  type VerdictOption,
} from '../../../components/inspection';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mobileLadderApi } from '../../../lib/mobileLadderService';
import { projectsApi } from '../../../lib/services';
import { renderInspectionPdf } from '../../../lib/inspection/renderMobile';
import { mobileLadderSchema } from '../../../lib/inspection/schemas/mobileLadder';
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
  ML_CHECKLIST_ITEMS,
  ML_RESULT_TO_CHIP,
  ML_CHIP_TO_RESULT,
  ML_VERDICT_LABELS,
  ML_CHECKLIST_OPTIONS,
  MOBILE_LADDER_TEMPLATE_ID,
  computeMLVerdictSuggestion,
  type MobileLadderInspection,
  type MLVerdict,
  type MLResult,
} from '../../../types/mobileLadder';

// ── Step constants ────────────────────────────────────────────────────────────

const IDENTIFICATION_STEP = 1;
const CHECKLIST_STEP      = 2;
const CONCLUSION_STEP     = 3;
const TOTAL_STEPS         = 3;
const STEP_LABELS         = ['კიბე', 'შემოწ.', 'დასკვნა'];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MobileLadderInspectionScreen() {
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

  const [inspection, setInspection] = useState<MobileLadderInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const [step, setStep] = useState(IDENTIFICATION_STEP);
  const prevStepRef = useRef(IDENTIFICATION_STEP);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<MobileLadderInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const persistKey = useMemo(() => `mobile-ladder-wizard:${id}:step`, [id]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const insp = await mobileLadderApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        let patched = insp;
        if (!insp.inspectorName && session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name) {
            patched = {
              ...patched,
              inspectorName: name,
              signature: { ...patched.signature, name },
            };
          }
        }
        if (patched.inspectorName !== insp.inspectorName) {
          mobileLadderApi.patch(patched.id, {
            inspectorName: patched.inspectorName,
          }).catch(() => {});
        }

        if (insp.status !== 'completed') {
          const saved = await AsyncStorage.getItem(persistKey);
          if (saved && !cancelled) {
            const s = parseInt(saved, 10);
            if (!isNaN(s) && s >= IDENTIFICATION_STEP && s <= CONCLUSION_STEP) setStep(s);
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
              mobileLadderApi.patch(patched.id, {
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
    if (step >= IDENTIFICATION_STEP && step <= CONCLUSION_STEP) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey]);

  useEffect(() => {
    return () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); };
  }, []);

  // ── Auto-save (debounced) ───────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: MobileLadderInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      mobileLadderApi.patch(insp.id, {
        company: insp.company,
        address: insp.address,
        inspectorName: insp.inspectorName,
        inspectionDate: insp.inspectionDate,
        ladderType: insp.ladderType,
        ladderTypeUnknown: insp.ladderTypeUnknown,
        model: insp.model,
        modelUnknown: insp.modelUnknown,
        heightM: insp.heightM,
        heightUnknown: insp.heightUnknown,
        maxLoadKg: insp.maxLoadKg,
        maxLoadUnknown: insp.maxLoadUnknown,
        nextInspectionDate: insp.nextInspectionDate,
        items: insp.items,
        verdict: insp.verdict,
        verdictComment: insp.verdictComment,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof MobileLadderInspection>(
    key: K,
    value: MobileLadderInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Identification fields ───────────────────────────────────────────────────

  const updateIdentification = useCallback((patch: Partial<MobileLadderInspection>) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Checklist items ─────────────────────────────────────────────────────────

  const handleChecklistChange = useCallback(
    (itemId: number, field: 'value' | 'comment', val: string | null) => {
      setInspection(prev => {
        if (!prev) return prev;
        const items = prev.items.map(i => {
          if (i.id !== itemId) return i;
          if (field === 'value') {
            const result: MLResult | null = val ? (ML_CHIP_TO_RESULT[val] ?? null) : null;
            return { ...i, result };
          }
          return { ...i, comment: val };
        });
        const next = { ...prev, items };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  // ── Photos ──────────────────────────────────────────────────────────────────

  const handleAddItemPhoto = useCallback(async (itemId: number) => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await mobileLadderApi.uploadPhoto(insp.id, itemId, result.uri);
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
      await mobileLadderApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i =>
        i.id === itemId
          ? { ...i, photo_paths: (i.photo_paths ?? []).filter(p => p !== path) }
          : i,
      );
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast]);

  // ── Signature ───────────────────────────────────────────────────────────────

  const handleSignChange = useCallback((idx: number, field: string, value: string) => {
    setInspection(prev => {
      if (!prev) return prev;
      const signature = {
        ...prev.signature,
        [field]: field === 'signature' ? (value || null) : value,
      };
      return { ...prev, signature };
    });
  }, []);

  const handleSign = useCallback((_idx: number, base64Png: string) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    const signature = { ...insp.signature, signature: base64Png, date: new Date().toISOString() };
    setInspection({ ...insp, signature });
  }, []);

  // ── Verdict auto-suggest ────────────────────────────────────────────────────

  const suggestedVerdict = useMemo(
    () => inspection ? computeMLVerdictSuggestion(inspection.items) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspection?.items],
  );

  // ── PDF ─────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    const insp = inspectionRef.current;
    if (!insp) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await renderInspectionPdf(mobileLadderSchema, { inspection: insp, projectName: projectName || 'პროექტი' });
      const pdfName = generatePdfName(
        projectName || 'project',
        'MobileLadderInspection',
        new Date(insp.inspectionDate),
        insp.id,
      );
      const uid = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, uid, {
        title: 'მობილური კიბის შემოწმების აქტი',
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
      const html = await renderInspectionPdf(mobileLadderSchema, { inspection: insp, projectName: projectName || 'პროექტი' });
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

  const isSigned = !!(inspection?.signature.signature);

  const handleComplete = useCallback(async () => {
    if (!inspection) return;
    const missing: string[] = [];
    if (!inspection.verdict)          missing.push('დასკვნა');

    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }

    setCompleting(true);
    try {
      await mobileLadderApi.patch(inspection.id, {
        company: inspection.company,
        address: inspection.address,
        inspectorName: inspection.inspectorName,
        inspectionDate: inspection.inspectionDate,
        ladderType: inspection.ladderType,
        ladderTypeUnknown: inspection.ladderTypeUnknown,
        model: inspection.model,
        modelUnknown: inspection.modelUnknown,
        heightM: inspection.heightM,
        heightUnknown: inspection.heightUnknown,
        maxLoadKg: inspection.maxLoadKg,
        maxLoadUnknown: inspection.maxLoadUnknown,
        nextInspectionDate: inspection.nextInspectionDate,
        items: inspection.items,
        verdict: inspection.verdict,
        verdictComment: inspection.verdictComment,
      });
      await mobileLadderApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:${MOBILE_LADDER_TEMPLATE_ID}`,
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

  // ── Step navigation ─────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
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

  const handlePrev = useCallback(async () => {
    if (step === IDENTIFICATION_STEP) {
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
        <Stack.Screen options={{ headerShown: true, title: 'კიბის შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="მობილური კიბე"
        requiredSignerRoles={[]}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        signedCount={inspection.signature?.signature ? 1 : 0}
        totalSlots={1}
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
              { role: 'ხელმომწერი', ...inspection.signature },
            ]}
            onChange={handleSignChange}
            onSign={(idx, base64) => {
              handleSign(idx, base64);
              onChanged();
            }}
          />
        )}
      />
    );
  }

  // ── Field configs for identification step ───────────────────────────────────

  const identFields = [
    {
      label: 'სახეობა / Type',
      value: inspection.ladderType ?? '',
      onChange: (v: string) => updateIdentification({ ladderType: v || null }),
      unknown: inspection.ladderTypeUnknown,
      onUnknownChange: (v: boolean) =>
        updateIdentification({ ladderTypeUnknown: v, ...(v ? { ladderType: null } : {}) }),
    },
    {
      label: 'მწარმოებელი / Model',
      value: inspection.model ?? '',
      onChange: (v: string) => updateIdentification({ model: v || null }),
      unknown: inspection.modelUnknown,
      onUnknownChange: (v: boolean) =>
        updateIdentification({ modelUnknown: v, ...(v ? { model: null } : {}) }),
    },
    {
      label: 'სიმაღლე (მ)',
      value: inspection.heightM != null ? String(inspection.heightM) : '',
      type: 'number' as const,
      onChange: (v: string) => {
        const n = parseFloat(v);
        updateIdentification({ heightM: isNaN(n) ? null : n });
      },
      unknown: inspection.heightUnknown,
      onUnknownChange: (v: boolean) =>
        updateIdentification({ heightUnknown: v, ...(v ? { heightM: null } : {}) }),
    },
    {
      label: 'მაქს. დატვირთვა (კგ)',
      value: inspection.maxLoadKg != null ? String(inspection.maxLoadKg) : '',
      type: 'number' as const,
      onChange: (v: string) => {
        const n = parseFloat(v);
        updateIdentification({ maxLoadKg: isNaN(n) ? null : n });
      },
      unknown: inspection.maxLoadUnknown,
      onUnknownChange: (v: boolean) =>
        updateIdentification({ maxLoadUnknown: v, ...(v ? { maxLoadKg: null } : {}) }),
    },
  ];

  // ── Checklist item data builder ─────────────────────────────────────────────

  const checklistItemsForSection = (sectionKey: 'A' | 'B') =>
    ML_CHECKLIST_ITEMS.filter(e => e.section === sectionKey).map(e => {
      const state = inspection.items.find(i => i.id === e.id)
        ?? { id: e.id, result: null, comment: null, photo_paths: [] };
      return {
        id: e.id,
        label: e.label,
        description: e.description || undefined,
        type: 'three_state' as const,
        options: ML_CHECKLIST_OPTIONS,
        value: state.result ? ML_RESULT_TO_CHIP[state.result] : null,
        comment: state.comment,
        photoPaths: state.photo_paths ?? [],
      };
    });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle="კიბის შემოწმება"
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

          {/* ── Step 1: Ladder Identification ───────────────────────────────── */}
          {step === IDENTIFICATION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <IdentificationGrid
                fields={identFields}
                allowUnknown
              />

              <View style={styles.nextDateRow}>
                <Text style={styles.fieldLabel}>მომდევნო შემოწმება</Text>
                <DateTimeField
                  label="მომდევნო შემოწმება"
                  value={
                    inspection.nextInspectionDate
                      ? new Date(inspection.nextInspectionDate)
                      : new Date()
                  }
                  onChange={d => update('nextInspectionDate', d.toISOString().slice(0, 10))}
                  mode="date"
                />
              </View>
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Checklist ────────────────────────────────────────────── */}
          {step === CHECKLIST_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1, paddingHorizontal: 16, paddingTop: 12,
                paddingBottom: 24, gap: 8,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <ChecklistSection
                title="A — სტრუქტურული მდგომარეობა"
                items={checklistItemsForSection('A')}
                onItemChange={handleChecklistChange}
                onAddPhoto={handleAddItemPhoto}
                onDeletePhoto={handleDeleteItemPhoto}
              />

              <ChecklistSection
                title="B — სამობილო სისტემა"
                items={checklistItemsForSection('B')}
                onItemChange={handleChecklistChange}
                onAddPhoto={handleAddItemPhoto}
                onDeletePhoto={handleDeleteItemPhoto}
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
                    შემოთავაზება: {ML_VERDICT_LABELS[suggestedVerdict]}
                  </Text>
                </Pressable>
              )}

              <Text style={styles.fieldLabel}>დასკვნა *</Text>
              <VerdictSelector
                options={([
                  { value: 'safe',   label: ML_VERDICT_LABELS.safe,   type: 'success' },
                  { value: 'minor',  label: ML_VERDICT_LABELS.minor,  type: 'warning' },
                  { value: 'banned', label: ML_VERDICT_LABELS.banned, type: 'danger'  },
                ] as VerdictOption[])}
                value={inspection.verdict}
                onChange={v => update('verdict', v as MLVerdict)}
                note={inspection.verdictComment}
                onNoteChange={v => update('verdictComment', v)}
                notePlaceholder="კომენტარი"
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
              title={step === TOTAL_STEPS - 1 ? 'გაგრძელება' : 'შემდეგი'}
              style={{ paddingVertical: 14 }}
              iconRight={<Ionicons name="chevron-forward" size={20} color={theme.colors.white} />}
              disabled={!canGoNext}
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
    root:    { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: {
      textAlign: 'center', fontSize: 11,
      color: theme.colors.inkFaint, paddingVertical: 2,
    },
    stepBody: {
      flexGrow: 1, paddingHorizontal: 16,
      paddingTop: 12, paddingBottom: 24, gap: 12,
    },
    footer: {
      paddingHorizontal: 16, paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
    },
    twoCol:   { flexDirection: 'row', gap: 8 },
    colHalf:  { flex: 1, gap: 4 },
    fieldLabel: {
      fontSize: 12, fontWeight: '600',
      color: theme.colors.inkSoft, marginBottom: 4,
    },
    nextDateRow: { gap: 4, marginTop: 8 },
    suggestBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.colors.warnSoft ?? theme.colors.accentSoft,
      borderRadius: 10, padding: 10,
    },
    suggestText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },
  });
}
