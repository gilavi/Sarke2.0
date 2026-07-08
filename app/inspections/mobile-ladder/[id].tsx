import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { InspectionShell } from '../../../components/inspection-steps/InspectionShell';
import { InspectionShellSkeleton } from '../../../components/inspection-steps/InspectionShellSkeleton';
import {
  ChecklistSection,
  IdentificationGrid,
} from '../../../components/inspection-parts';
import { ConclusionStep, type VerdictOption } from '../../../components/inspection-steps';
import { EquipmentResultScreen } from '../../../features/inspection-result';
import type { ChecklistSection as ResultChecklistSection, ResultOption } from '../../../lib/inspection/schema';
import { shortCode } from '../../../lib/shared/documentName';
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
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';

import {
  ML_CHECKLIST_ITEMS,
  ML_RESULT_TO_CHIP,
  ML_CHIP_TO_RESULT,
  ML_VERDICT_LABELS,
  ML_CHECKLIST_OPTIONS,
  MOBILE_LADDER_TEMPLATE_ID,
  type MobileLadderInspection,
  type MLVerdict,
  type MLResult,
} from '../../../types/mobileLadder';

// ── Step constants ────────────────────────────────────────────────────────────

const IDENTIFICATION_STEP = 1;
const CHECKLIST_STEP      = 2;
const CONCLUSION_STEP     = 3;
const TOTAL_STEPS         = 3;

const ML_VERDICT_OPTIONS: VerdictOption<MLVerdict>[] = [
  { value: 'safe',   label: ML_VERDICT_LABELS.safe,   tone: 'success' },
  { value: 'minor',  label: ML_VERDICT_LABELS.minor,  tone: 'caution' },
  { value: 'banned', label: ML_VERDICT_LABELS.banned, tone: 'danger'  },
];

// Result vocabulary for the completed detail page (mirrors the PDF result pills).
// Values are the raw MLResult enum stored on each item.
const MOBILE_LADDER_RESULT_OPTIONS: ResultOption[] = [
  { value: 'safe',    label: ML_RESULT_TO_CHIP.safe,    short: ML_RESULT_TO_CHIP.safe,    mark: '✓', tone: 'good' },
  { value: 'damaged', label: ML_RESULT_TO_CHIP.damaged, short: ML_RESULT_TO_CHIP.damaged, mark: '✗', tone: 'bad' },
  { value: 'na',      label: ML_RESULT_TO_CHIP.na,      short: ML_RESULT_TO_CHIP.na,      mark: 'Z', tone: 'neutral' },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MobileLadderInspectionScreen() {
  const { t } = useTranslation();
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
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, updateMany: updateIdentification, scheduleSave,
    complete, reopen, handlePdf, exit, creatorName,
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
      summaryPhotos: insp.summaryPhotos,
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

  // Enabled finish button + on-press field errors (see useSubmitGuard).
  const { attempted, markAttempted, reset: resetAttempted } = useSubmitGuard();

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


  // ── Summary photos (conclusion step) ─────────────────────────────────────────

  const handleAddSummaryPhoto = useCallback(async () => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
      try {
        const path = await mobileLadderApi.uploadSummaryPhoto(insp.id, result.uri);
        setInspection(prev => {
          if (!prev) return prev;
          const next = { ...prev, summaryPhotos: [...prev.summaryPhotos, path] };
          scheduleSave(next);
          return next;
        });
      } catch (e) {
        toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
      }
    }
  }, [pickPhotosWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

  const handleDeleteSummaryPhoto = useCallback(async (path: string) => {
    try {
      await mobileLadderApi.deletePhoto(path);
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
  }, [scheduleSave, toast, setInspection]);

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

  // Clear the "attempted" error reveal whenever the step changes.
  useEffect(() => { resetAttempted(); }, [step, resetAttempted]);

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
        photos={false}
        onClose={() => router.back()}
      />
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    const verdictTone = inspection.verdict === 'safe' ? 'safe'
      : inspection.verdict === 'banned' ? 'severe' : 'muted';

    const buildSection = (key: 'A' | 'B', title: string): ResultChecklistSection => ({
      title,
      items: ML_CHECKLIST_ITEMS.filter((e) => e.section === key).map((entry) => {
        const st = inspection.items.find((i) => i.id === entry.id);
        return {
          id: entry.id,
          label: entry.label,
          description: entry.description || undefined,
          result: st?.result ?? null,
          comment: st?.comment ?? null,
          photoPaths: st?.photo_paths ?? [],
        };
      }),
    });

    const sections: ResultChecklistSection[] = [
      buildSection('A', 'III - სტრუქტურული მდგომარეობა'),
      buildSection('B', 'IV - სამობილო სისტემა'),
    ];

    const info = [
      { label: t('details.info.project'), value: inspection.company || '—' },
      { label: 'სახეობა / Type', value: inspection.ladderType || '—' },
      { label: 'მწარმოებელი / Model', value: inspection.model || '—' },
      { label: 'სიმაღლე (მ)', value: inspection.heightM != null ? `${inspection.heightM} მ` : '—' },
      { label: 'მაქს. დატვირთვა (კგ)', value: inspection.maxLoadKg != null ? `${inspection.maxLoadKg} კგ` : '—' },
      { label: t('details.info.date'), value: new Date(inspection.inspectionDate).toLocaleDateString('ka-GE') },
      { label: t('details.info.expert'), value: inspection.inspectorName || creatorName || '—' },
      { label: t('details.info.code'), value: shortCode(inspection.id) },
    ];

    return (
      <EquipmentResultScreen
        flow={{ creatorName, reopen, handlePdf, generatingPdf, pdfLocked, limitNoticeVisible, setLimitNoticeVisible }}
        title="კიბის შემოწმება"
        status={inspection.verdict ? { tone: verdictTone, label: ML_VERDICT_LABELS[inspection.verdict] } : null}
        info={info}
        sections={sections}
        resultOptions={MOBILE_LADDER_RESULT_OPTIONS}
        notes={inspection.verdictComment}
        summaryPhotos={inspection.summaryPhotos ?? []}
      />
    );
  }

  // ── Field configs for identification step ───────────────────────────────────

  const identFields = [
    {
      label: 'სახეობა / Type',
      value: inspection.ladderType ?? '',
      onChange: (v: string) => updateIdentification({ ladderType: v || null }),
    },
    {
      label: 'მწარმოებელი / Model',
      value: inspection.model ?? '',
      onChange: (v: string) => updateIdentification({ model: v || null }),
    },
    {
      label: 'სიმაღლე (მ)',
      value: inspection.heightM != null ? String(inspection.heightM) : '',
      type: 'number' as const,
      onChange: (v: string) => {
        const n = parseFloat(v);
        updateIdentification({ heightM: isNaN(n) ? null : n });
      },
    },
    {
      label: 'მაქს. დატვირთვა (კგ)',
      value: inspection.maxLoadKg != null ? String(inspection.maxLoadKg) : '',
      type: 'number' as const,
      onChange: (v: string) => {
        const n = parseFloat(v);
        updateIdentification({ maxLoadKg: isNaN(n) ? null : n });
      },
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
        onBlockedNext={markAttempted}
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
                columns={1}
              />
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
            <ConclusionStep
              verdict={inspection.verdict}
              verdictOptions={ML_VERDICT_OPTIONS}
              verdictError={attempted && !inspection.verdict}
              onVerdictChange={v => update('verdict', v as MLVerdict)}
              notes={inspection.verdictComment}
              onNotesChange={v => update('verdictComment', v)}
              completing={completing}
              photoPaths={inspection.summaryPhotos}
              onAddPhoto={handleAddSummaryPhoto}
              onDeletePhoto={handleDeleteSummaryPhoto}
            />
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
  });
}
