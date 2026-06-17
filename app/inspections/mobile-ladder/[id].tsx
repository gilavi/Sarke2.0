import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lightbulb } from 'lucide-react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { DateTimeField } from '../../../components/DateTimeField';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { InspectionShell } from '../../../components/inspection-steps/InspectionShell';
import { InspectionShellSkeleton } from '../../../components/inspection-steps/InspectionShellSkeleton';
import {
  ChecklistSection,
  VerdictSelector,
  IdentificationGrid,
  type VerdictOption,
} from '../../../components/inspection-parts';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { mobileLadderApi } from '../../../lib/mobileLadderService';
import { mobileLadderSchema } from '../../../lib/inspection/schemas/mobileLadder';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { friendlyError } from '../../../lib/errorMap';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoPicker } from '../../../hooks/usePhotoPicker';

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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MobileLadderInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { pickPhotosWithAnnotation } = usePhotoPicker();

  // Shared orchestration: loading, step+persist, autosave, complete, celebration,
  // PDF preview/download, limit notice. Type-specific bits are passed as callbacks so
  // behaviour matches the pre-refactor screen exactly.
  const {
    inspection, setInspection, inspectionRef,
    projectName, saving, loading, completing, celebrating, generatingPdf,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, updateMany: updateIdentification, scheduleSave,
    complete, handlePdf, buildPreview, exit, creatorName,
  } = useInspectionFlow<MobileLadderInspection>({
    id,
    firstStep: IDENTIFICATION_STEP,
    lastStep: CONCLUSION_STEP,
    persistPrefix: 'mobile-ladder-wizard',
    templateId: MOBILE_LADDER_TEMPLATE_ID,
    schema: mobileLadderSchema,
    api: mobileLadderApi,
    toPatch: (insp) => ({
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
    }),
    validateMissing: (insp) => (insp.verdict ? [] : ['დასკვნა']),
    autofill: (insp, { inspectorName, project }) => {
      let next = insp;
      const patch: Record<string, unknown> = {};
      if (!insp.inspectorName && inspectorName) {
        next = { ...next, inspectorName, signature: { ...next.signature, name: inspectorName } };
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
      nameLabel: 'MobileLadderInspection',
      title: 'მობილური კიბის შემოწმების აქტი',
      subject: 'შრომის უსაფრთხოება',
    },
    loadingTitle: 'კიბის შემოწმება',
  });

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
    [scheduleSave, setInspection],
  );

  // ── Photos ──────────────────────────────────────────────────────────────────

  const handleAddItemPhoto = useCallback(async (itemId: number) => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
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
    }
  }, [pickPhotosWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

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
  }, [scheduleSave, toast, setInspection]);

  // ── Verdict auto-suggest ────────────────────────────────────────────────────

  const suggestedVerdict = useMemo(
    () => inspection ? computeMLVerdictSuggestion(inspection.items) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspection?.items],
  );

  const isSigned = !!(inspection?.signature.signature);

  // ── Step navigation ─────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !completing;
    return true;
  }, [step, inspection, completing]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await complete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, complete, setStep]);

  const handlePrev = useCallback(async () => {
    if (step === IDENTIFICATION_STEP) {
      await exit();
    } else {
      setStep(s => s - 1);
    }
  }, [step, exit, setStep]);

  // ── Loading & completed ─────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <InspectionShellSkeleton
        title="კიბის შემოწმება"
        projectName={projectName ?? ''}
        step={step - 1}
        totalSteps={TOTAL_STEPS}
        variant={
          step === CHECKLIST_STEP ? 'checklist'
            : step === CONCLUSION_STEP ? 'conclusion'
            : 'form'
        }
        fields={4}
        onClose={() => router.back()}
      />
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="მობილური კიბე"
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        attachmentCount={0}
        pdfLocked={pdfLocked}
        downloading={generatingPdf}
        limitNoticeVisible={limitNoticeVisible}
        onLimitNoticeClose={() => setLimitNoticeVisible(false)}
        creatorName={creatorName}
        onDownloadPdf={(sig) => void handlePdf(sig)}
        onSheetSaved={() => void buildPreview()}
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
      <InspectionShell
        title="კიბის შემოწმება"
        projectName={projectName ?? ''}
        step={step - 1}
        totalSteps={TOTAL_STEPS}
        direction={direction}
        animate={animateSteps}
        canGoNext={canGoNext}
        isLastStep={step === CONCLUSION_STEP}
        completing={completing}
        banner={pdfLocked ? <PdfLockedBanner onDetails={() => setLimitNoticeVisible(true)} /> : undefined}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={() => router.back()}
      >

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
                columns={1}
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
                title="A - სტრუქტურული მდგომარეობა"
                items={checklistItemsForSection('A')}
                onItemChange={handleChecklistChange}
                onAddPhoto={handleAddItemPhoto}
                onDeletePhoto={handleDeleteItemPhoto}
              />

              <ChecklistSection
                title="B - სამობილო სისტემა"
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
                  <Lightbulb size={16} color={theme.colors.warn} strokeWidth={1.5} />
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

        </InspectionShell>

      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
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
