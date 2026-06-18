import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { InspectionShell } from '../../../components/inspection-steps/InspectionShell';
import { InspectionShellSkeleton } from '../../../components/inspection-steps/InspectionShellSkeleton';
import {
  ChecklistSection,
  DynamicTable,
  PhotoSection,
  SlingsIdentificationStep,
} from '../../../components/inspection-parts';
import { ConclusionStep, type VerdictOption } from '../../../components/inspection-steps';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { liftingAccessoriesApi } from '../../../lib/liftingAccessoriesService';
import { liftingAccessoriesSchema } from '../../../lib/inspection/schemas/liftingAccessories';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { friendlyError } from '../../../lib/errorMap';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoPicker } from '../../../hooks/usePhotoPicker';
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';

import {
  LA_CHECKLIST_ITEMS,
  LA_RESULT_TO_CHIP,
  LA_CHIP_TO_RESULT,
  LA_VERDICT_LABELS,
  LA_CHECKLIST_OPTIONS,
  LIFTING_ACCESSORIES_TEMPLATE_ID,
  computeLAVerdictSuggestion,
  buildDefaultLARemovedRow,
  type LiftingAccessoriesInspection,
  type LAVerdict,
  type LAResult,
  type LARemovedRow,
} from '../../../types/liftingAccessories';

// ── Step constants ────────────────────────────────────────────────────────────

const IDENTIFICATION_STEP = 1;
const CHECKLIST_STEP      = 2;
const REMOVED_STEP        = 3;
const CONCLUSION_STEP     = 4;
const TOTAL_STEPS         = 4;

const LA_VERDICT_OPTIONS: VerdictOption<LAVerdict>[] = [
  { value: 'pass',   label: LA_VERDICT_LABELS.pass,   tone: 'success' },
  { value: 'repair', label: LA_VERDICT_LABELS.repair, tone: 'caution' },
  { value: 'fail',   label: LA_VERDICT_LABELS.fail,   tone: 'danger'  },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LiftingAccessoriesInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { pickPhotosWithAnnotation } = usePhotoPicker();

  // Enabled finish button + on-press field errors (see useSubmitGuard).
  const { attempted, markAttempted, reset: resetAttempted } = useSubmitGuard();

  // Shared orchestration: loading, step+persist, autosave, complete, celebration,
  // PDF preview/download, limit notice. Type-specific bits are passed as callbacks so
  // behaviour matches the pre-refactor screen exactly.
  const {
    inspection, setInspection, inspectionRef,
    projectName, saving, loading, completing, celebrating, generatingPdf,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, updateMany, scheduleSave,
    complete, handlePdf, buildPreview, exit, creatorName,
  } = useInspectionFlow<LiftingAccessoriesInspection>({
    id,
    firstStep: IDENTIFICATION_STEP,
    lastStep: CONCLUSION_STEP,
    persistPrefix: 'lifting-accessories-wizard',
    templateId: LIFTING_ACCESSORIES_TEMPLATE_ID,
    schema: liftingAccessoriesSchema,
    api: liftingAccessoriesApi,
    toPatch: (insp) => ({
      company:             insp.company,
      address:             insp.address,
      inspectorName:       insp.inspectorName,
      inspectionDate:      insp.inspectionDate,
      equipmentTypes:      insp.equipmentTypes,
      equipmentTypeOther:  insp.equipmentTypeOther,
      serialNumber:        insp.serialNumber,
      manufacturer:        insp.manufacturer,
      yearOfManufacture:   insp.yearOfManufacture,
      markingStatus:       insp.markingStatus,
      wllKg:               insp.wllKg,
      unitCount:           insp.unitCount,
      nextInspectionDate:  insp.nextInspectionDate,
      items:               insp.items,
      removedRows:         insp.removedRows,
      verdict:             insp.verdict,
      verdictComment:      insp.verdictComment,
      summaryPhotos:       insp.summaryPhotos,
    }),
    validateMissing: (insp) => (insp.verdict ? [] : ['დასკვნა']),
    autofill: (insp, { inspectorName, project }) => {
      let next = insp;
      const patch: Record<string, unknown> = {};
      if (!insp.inspectorName && inspectorName) {
        next = {
          ...next,
          inspectorName,
          signatures: [
            { ...next.signatures[0], name: inspectorName },
            next.signatures[1],
          ],
        };
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
      nameLabel: 'LiftingAccessoriesInspection',
      title: 'ამწე მოწყ. / სლინგი / ჩამჭ. შემოწმება',
      subject: 'შრომის უსაფრთხოება',
    },
    loadingTitle: 'სლინგის შემოწმება',
  });

  // ── Checklist items ─────────────────────────────────────────────────────────

  const handleChecklistChange = useCallback(
    (itemId: number, field: 'value' | 'comment', val: string | null) => {
      setInspection(prev => {
        if (!prev) return prev;
        const items = prev.items.map(i => {
          if (i.id !== itemId) return i;
          if (field === 'value') {
            const result: LAResult | null = val ? (LA_CHIP_TO_RESULT[val] ?? null) : null;
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

  // ── Item photos ─────────────────────────────────────────────────────────────

  const handleAddItemPhoto = useCallback(async (itemId: number) => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
      try {
        const path = await liftingAccessoriesApi.uploadPhoto(insp.id, itemId, result.uri);
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
      await liftingAccessoriesApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხ.'));
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

  // ── Summary photos ──────────────────────────────────────────────────────────

  const handleAddSummaryPhoto = useCallback(async () => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
      try {
        const path = await liftingAccessoriesApi.uploadPhoto(insp.id, 'summary', result.uri);
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
      await liftingAccessoriesApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხ.'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, summaryPhotos: prev.summaryPhotos.filter(p => p !== path) };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast, setInspection]);

  // ── Removed rows ────────────────────────────────────────────────────────────

  const handleRemovedRowsChange = useCallback((rows: Record<string, any>[]) => {
    const removedRows = rows.map(({ num: _n, ...r }) => r as LARemovedRow);
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, removedRows };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

  // ── Verdict auto-suggest ────────────────────────────────────────────────────

  const suggestedVerdict = useMemo(
    () => inspection ? computeLAVerdictSuggestion(inspection.items, inspection.markingStatus) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspection?.items, inspection?.markingStatus],
  );

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

  // ── Checklist items builder ─────────────────────────────────────────────────

  const checklistItemsForSection = (sectionKey: 'A' | 'B') =>
    LA_CHECKLIST_ITEMS.filter(e => e.section === sectionKey).map(e => {
      const state = inspection!.items.find(i => i.id === e.id)
        ?? { id: e.id, result: null, comment: null, photo_paths: [] };
      return {
        id: e.id,
        label: e.label,
        description: e.description || undefined,
        type: 'binary' as const,
        options: LA_CHECKLIST_OPTIONS,
        value: state.result ? LA_RESULT_TO_CHIP[state.result] : null,
        comment: state.comment,
        photoPaths: state.photo_paths ?? [],
      };
    });

  // ── Loading & completed ─────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <InspectionShellSkeleton
        title="სლინგ. / ჩამჭ. შემოწ."
        projectName={projectName ?? ''}
        step={step - 1}
        totalSteps={TOTAL_STEPS}
        variant={
          step === CHECKLIST_STEP ? 'checklist'
            : step === REMOVED_STEP ? 'table'
            : step === CONCLUSION_STEP ? 'conclusion'
            : 'form'
        }
        fields={3}
        onClose={() => router.back()}
      />
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ამწე მოწყ. / სლინგი"
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <InspectionShell
        title="სლინგ. / ჩამჭ. შემოწ."
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

          {/* ── Step 1: Equipment Identification ────────────────────────────── */}
          {step === IDENTIFICATION_STEP && (
            <SlingsIdentificationStep
              equipmentTypes={inspection.equipmentTypes}
              equipmentTypeOther={inspection.equipmentTypeOther}
              serialNumber={inspection.serialNumber}
              manufacturer={inspection.manufacturer}
              yearOfManufacture={inspection.yearOfManufacture}
              wllKg={inspection.wllKg}
              unitCount={inspection.unitCount}
              markingStatus={inspection.markingStatus}
              nextInspectionDate={inspection.nextInspectionDate}
              onUpdate={updateMany}
            />
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
                title="A - ვიზუალური შემოწმება"
                items={checklistItemsForSection('A')}
                onItemChange={handleChecklistChange}
                onAddPhoto={handleAddItemPhoto}
                onDeletePhoto={handleDeleteItemPhoto}
              />

              <ChecklistSection
                title="B - ფუნქციური შემოწმება"
                items={checklistItemsForSection('B')}
                onItemChange={handleChecklistChange}
                onAddPhoto={handleAddItemPhoto}
                onDeletePhoto={handleDeleteItemPhoto}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 3: Removed from service + photos ───────────────────────── */}
          {step === REMOVED_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <Text style={styles.sectionLabel}>ამოღებული მოწყობილობები</Text>
              <DynamicTable
                columns={[
                  { key: 'serialNumber',    label: 'სერ. NN / ID',     type: 'text' },
                  { key: 'typeDescription', label: 'ტ-პი / სახელ.',    type: 'text' },
                  { key: 'reason',          label: 'ამოღების მიზეზი',  type: 'text' },
                ]}
                rows={inspection.removedRows}
                onChange={handleRemovedRowsChange}
                onBuildDefaultRow={buildDefaultLARemovedRow}
              />

              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>საერთო ფოტო მასალა</Text>
              <PhotoSection
                photoPaths={inspection.summaryPhotos}
                onAdd={handleAddSummaryPhoto}
                onDelete={handleDeleteSummaryPhoto}
                title=""
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 4: Conclusion ───────────────────────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <ConclusionStep
              verdict={inspection.verdict}
              verdictOptions={LA_VERDICT_OPTIONS}
              verdictError={attempted && !inspection.verdict}
              onVerdictChange={v => update('verdict', v as LAVerdict)}
              suggestion={
                suggestedVerdict && inspection.verdict !== suggestedVerdict
                  ? {
                      text: `შემოთ.: ${LA_VERDICT_LABELS[suggestedVerdict]}`,
                      onApply: () => update('verdict', suggestedVerdict),
                    }
                  : null
              }
              notes={inspection.verdictComment ?? ''}
              onNotesChange={v => update('verdictComment', v)}
              completing={completing}
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
    sectionLabel: {
      fontSize: 13, fontWeight: '700',
      color: theme.colors.ink, marginBottom: 4,
    },
  });
}
