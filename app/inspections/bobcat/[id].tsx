import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { PlateInput, type PlateInputHandle } from '../../../components/inputs/PlateInput';
import { SerialKeypad } from '../../../components/inputs/SerialKeypad';
import { InspectionShell, InspectionShellSkeleton, ChecklistStep, ConclusionStep } from '../../../components/inspection-steps';
import type { VerdictOption } from '../../../components/inspection-steps';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';

import { bobcatApi } from '../../../lib/bobcatService';
import { inspectionAttachmentsApi } from '../../../lib/services';
import { PhotoSection } from '../../../components/inspection-parts';

import { bobcatSchema } from '../../../lib/inspection/schemas/bobcat';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';
import { SuggestionPills } from '../../../components/SuggestionPills';
import { useFieldHistory } from '../../../hooks/useFieldHistory';
import { usePhotoPicker } from '../../../hooks/usePhotoPicker';
import { useSession } from '../../../lib/session';
import { friendlyError } from '../../../lib/errorMap';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BOBCAT_ITEMS,
  BOBCAT_CATEGORY_LABELS,
  VERDICT_LABEL,
  LARGE_LOADER_TEMPLATE_ID,
  LARGE_LOADER_ITEMS,
  categoryCounts,
  type BobcatInspection,
  type BobcatVerdict,
  type BobcatItemState,
  type BobcatCategory,
  type BobcatChecklistEntry,
} from '../../../types/bobcat';

// ── Step constants (template-derived; kept local per task instructions) ────────

const CATEGORIES: BobcatCategory[] = ['A', 'B', 'C', 'D'];

const PROJECT_STEP    = 0;
const INFO_STEP       = 1;
const SERIAL_STEP     = 2;
const CHECKLIST_STEP  = 3;
const CONCLUSION_STEP = 4;
const TOTAL_STEPS     = 5;

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BobcatInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const { pickPhotosWithAnnotation } = usePhotoPicker();

  const userId = session?.state?.status === 'signedIn' ? session.state.session.user.id : null;

  // ── Field suggestion histories ────────────────────────────────────────────
  const equipmentModelHistory = useFieldHistory(userId, 'bobcat:equipmentModel');
  const registrationNumberHistory = useFieldHistory(userId, 'bobcat:registrationNumber');

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [attachmentCount, setAttachmentCount] = useState(0);

  // Enabled finish button + on-press field errors (see useSubmitGuard).
  const { attempted, markAttempted, reset: resetAttempted } = useSubmitGuard();

  // Serial number step state
  const plateRef = useRef<PlateInputHandle>(null);
  const [activeSlotKind, setActiveSlotKind] = useState<'letter' | 'digit'>('letter');

  const summaryPhotosKey = useMemo(() => `bobcat-wizard:${id}:summaryPhotos`, [id]);

  // ── Shared orchestration via useInspectionFlow ────────────────────────────

  const {
    inspection, setInspection, inspectionRef,
    projectName,
    saving, loading, completing,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, scheduleSave,
    complete, reopen, handlePdf, buildPreview, exit,
    generatingPdf, creatorName,
  } = useInspectionFlow<BobcatInspection>({
    id,
    firstStep: INFO_STEP,
    lastStep: CONCLUSION_STEP,
    persistPrefix: 'bobcat-wizard',
    templateId: LARGE_LOADER_TEMPLATE_ID, // used for calendar key; bobcat template also works
    schema: bobcatSchema,
    api: bobcatApi,
    toPatch: (insp) => ({
      company: insp.company,
      address: insp.address,
      equipmentModel: insp.equipmentModel,
      registrationNumber: insp.registrationNumber,
      inspectionDate: insp.inspectionDate,
      inspectionType: insp.inspectionType,
      inspectorName: insp.inspectorName,
      items: insp.items,
      verdict: insp.verdict,
      notes: insp.notes,
    }),
    validateMissing: (insp) => {
      const missing: string[] = [];
      if (!insp.equipmentModel?.trim())     missing.push('დამტვირთველის მარკა / მოდელი');
      if (!insp.registrationNumber?.trim()) missing.push('სახელმწიფო / ს.ნ ნომერი');
      if (!insp.verdict)                    missing.push('შეჯამება: დასკვნა');
      return missing;
    },
    autofill: (insp, { inspectorName, project }) => {
      let next = insp;
      const patch: Record<string, unknown> = {};
      if (!insp.inspectorName && inspectorName) {
        next = { ...next, inspectorName };
        patch.inspectorName = inspectorName;
      }
      if (project) {
        if (!next.company?.trim()) {
          const v = project.company_name || project.name;
          next = { ...next, company: v };
          patch.company = v;
        }
        if (!next.address?.trim() && project.address) {
          next = { ...next, address: project.address };
          patch.address = project.address;
        }
      }
      return { next, patch: Object.keys(patch).length ? patch : null };
    },
    pdf: {
      nameLabel: 'BobcatInspection',
      title: 'ციცხვიანი დამტვირთველის შემოწმება',
      subject: 'შრომის უსაფრთხოების შემოწმება',
    },
    loadingTitle: 'შემოწმება',
  });

  // ── Template-derived catalog (local - template bounds must stay in screen) ──

  const catalog: BobcatChecklistEntry[] = useMemo(
    () => inspection?.templateId === LARGE_LOADER_TEMPLATE_ID ? LARGE_LOADER_ITEMS : BOBCAT_ITEMS,
    [inspection?.templateId],
  );

  const isLargeLoader = inspection?.templateId === LARGE_LOADER_TEMPLATE_ID;
  const screenTitle = isLargeLoader ? 'დიდი ციცხვიანი დამტვირთველი' : 'ციცხვიანი დამტვირთველი';

  // ── Item update ───────────────────────────────────────────────────────────

  const updateItem = useCallback((
    itemId: number,
    patch: Partial<Pick<BobcatItemState, 'result' | 'comment'>>,
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
  }, [scheduleSave, setInspection]);

  // ── Photo handling ─────────────────────────────────────────────────────────

  const handleAddPhoto = useCallback(async (itemId: number) => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
      try {
        const path = await bobcatApi.uploadPhoto(insp.id, itemId, result.uri);
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
    }
  }, [pickPhotosWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

  const handleDeletePhoto = useCallback(async (itemId: number, path: string) => {
    try {
      await bobcatApi.deletePhoto(path);
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
  }, [scheduleSave, toast, setInspection]);

  // ── Summary Photos ─────────────────────────────────────────────────────────

  const handleAddSummaryPhoto = useCallback(async () => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
      try {
        const path = await bobcatApi.uploadSummaryPhoto(insp.id, result.uri);
        setInspection(prev => {
          if (!prev) return prev;
          const next = { ...prev, summaryPhotos: [...(prev.summaryPhotos ?? []), path] };
          AsyncStorage.setItem(summaryPhotosKey, JSON.stringify(next.summaryPhotos)).catch(() => {});
          return next;
        });
      } catch (e) {
        toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
      }
    }
  }, [pickPhotosWithAnnotation, toast, inspectionRef, setInspection, summaryPhotosKey]);

  const handleDeleteSummaryPhoto = useCallback(async (path: string) => {
    try {
      await bobcatApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, summaryPhotos: (prev.summaryPhotos ?? []).filter(p => p !== path) };
      AsyncStorage.setItem(summaryPhotosKey, JSON.stringify(next.summaryPhotos)).catch(() => {});
      return next;
    });
  }, [summaryPhotosKey, toast, setInspection]);

  // ── Step navigation ────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === PROJECT_STEP) return true;
    if (step === INFO_STEP) return !!inspection.equipmentModel?.trim();
    if (step === SERIAL_STEP) return !!inspection.registrationNumber?.trim();
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !completing;
    return true;
  }, [step, inspection, completing]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      const ok = await complete();
      if (ok) router.push(`/inspections/bobcat/${id}/done` as any);
    } else if (step < CONCLUSION_STEP) {
      setStep(s => s + 1);
    }
  }, [step, complete, id, router, setStep]);

  const handlePrev = useCallback(async () => {
    if (step === INFO_STEP) {
      await exit();
    } else {
      setStep(s => s - 1);
    }
  }, [step, exit, setStep]);

  // Clear the "attempted" error reveal whenever the step changes.
  useEffect(() => { resetAttempted(); }, [step, resetAttempted]);

  // ── Derived data for shared components ────────────────────────────────────

  const checklistItems = useMemo(
    () => catalog.map(e => ({ id: String(e.id), description: e.description })),
    [catalog],
  );

  const checklistStates = useMemo(
    () => catalog.map(e => {
      const s = inspection?.items.find(i => i.id === e.id);
      return {
        id: String(e.id),
        result: (s?.result ?? null) as import('../../../components/inspection-steps').ChecklistResult,
        comment: s?.comment ?? null,
        photo_paths: s?.photo_paths ?? [],
      };
    }),
    [catalog, inspection?.items],
  );

  const bobcatVerdictOptions = useMemo<VerdictOption<BobcatVerdict>[]>(
    () => (['approved', 'limited', 'rejected'] as BobcatVerdict[]).map(v => ({
      value: v,
      label: VERDICT_LABEL[v],
    })),
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <InspectionShellSkeleton
        title={screenTitle}
        projectName={projectName ?? ''}
        step={step - 1}
        totalSteps={TOTAL_STEPS - 1}
        variant={
          step === SERIAL_STEP ? 'keypad'
            : step === CHECKLIST_STEP ? 'checklist'
            : step === CONCLUSION_STEP ? 'conclusion'
            : 'form'
        }
        fields={1}
        onClose={() => router.back()}
      />
    );
  }

  // ── Completed inspection result view ───────────────────────────────────────
  if (inspection.status === 'completed') {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName={screenTitle}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        attachmentCount={attachmentCount}
        pdfLocked={pdfLocked}
        downloading={generatingPdf}
        limitNoticeVisible={limitNoticeVisible}
        onLimitNoticeClose={() => setLimitNoticeVisible(false)}
        creatorName={creatorName}
        onEdit={() => void reopen()}
        onDownloadPdf={(sig) => void handlePdf(sig)}
        onSheetSaved={() => {
          inspectionAttachmentsApi.listByInspection(inspection.id)
            .then(a => setAttachmentCount(a.length)).catch(() => {});
          void buildPreview();
        }}
      />
    );
  }

  return (
    <InspectionShell
      title={screenTitle}
      projectName={projectName}
      step={step - 1}
      totalSteps={TOTAL_STEPS - 1}
      direction={direction}
      animate={animateSteps}
      canGoNext={canGoNext}
      isLastStep={step === CONCLUSION_STEP}
      completing={completing}
      onBlockedNext={markAttempted}
      onNext={handleNext}
      onPrev={handlePrev}
      onClose={() => router.back()}
    >
          {/* ── Step 1: Equipment model ─────────────────────────────────── */}
          {step === INFO_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <FloatingLabelInput
                label="დამტვირთველის მარკა / მოდელი *"
                value={inspection.equipmentModel ?? ''}
                onChangeText={v => update('equipmentModel', v)}
                onFocus={() => setFocusedField('equipmentModel')}
                onBlur={() => {
                  setFocusedField(null);
                  if (inspection.equipmentModel?.trim()) {
                    equipmentModelHistory.addToHistory(inspection.equipmentModel.trim());
                  }
                }}
                required
              />
              {equipmentModelHistory.suggestions.length > 0 && (
                <SuggestionPills
                  suggestions={equipmentModelHistory.suggestions}
                  onSelect={v => {
                    update('equipmentModel', v);
                    setFocusedField(null);
                  }}
                  visible={focusedField === 'equipmentModel' || (!inspection.equipmentModel?.trim() && equipmentModelHistory.suggestions.length > 0)}
                />
              )}
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Serial Number (custom on-screen keypad) ─────────── */}
          {step === SERIAL_STEP && (
            <View style={{ flex: 1 }}>
              <View style={{ paddingHorizontal: 20, paddingTop: 32, gap: 20, alignItems: 'center' }}>
                <PlateInput
                  ref={plateRef}
                  label="სახელმწიფო / ს.ნ ნომერი"
                  value={inspection.registrationNumber ?? ''}
                  onChangeText={v => {
                    update('registrationNumber', v);
                    if (v.trim()) registrationNumberHistory.addToHistory(v.trim());
                  }}
                  customKeyboard
                  onActiveSlotKindChange={k => setActiveSlotKind(k ?? 'letter')}
                  required
                />
                {registrationNumberHistory.suggestions.length > 0 && (
                  <SuggestionPills
                    suggestions={registrationNumberHistory.suggestions}
                    onSelect={v => update('registrationNumber', v)}
                    visible
                  />
                )}
              </View>
              <View style={{ flex: 1 }} />
              <SerialKeypad
                slotKind={activeSlotKind}
                onKey={k => plateRef.current?.pressKey(k)}
              />
            </View>
          )}

          {/* ── Step 3: Checklist ──────────────────────────────────────── */}
          {step === CHECKLIST_STEP && (
            <ChecklistStep
              items={checklistItems}
              states={checklistStates}
              onStateChange={(sid, patch) => updateItem(Number(sid), patch as any)}
              showCommentButton={false}
            />
          )}

          {/* ── Step 4: Conclusion ─────────────────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <ConclusionStep
              verdict={inspection.verdict}
              verdictOptions={bobcatVerdictOptions}
              verdictError={attempted && !inspection.verdict}
              notes={inspection.notes ?? ''}
              onVerdictChange={v => update('verdict', v)}
              onNotesChange={v => update('notes', v || null)}
              completing={completing}
              photoSection={
                <>
                  <Text style={[styles.fieldLabel, { color: theme.colors.ink }]}>ფოტოები (სურვ.)</Text>
                  <PhotoSection
                    photoPaths={inspection.summaryPhotos ?? []}
                    onAdd={handleAddSummaryPhoto}
                    onDelete={handleDeleteSummaryPhoto}
                  />
                </>
              }
            />
          )}
    </InspectionShell>
  );
}

// ── Screen styles ────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
  });
}
