import { useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { InspectionShell } from '../../../components/inspection-steps/InspectionShell';
import { InspectionShellSkeleton } from '../../../components/inspection-steps/InspectionShellSkeleton';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { forkliftApi } from '../../../lib/forkliftService';
import {
  ChecklistSection,
  IdentificationGrid,
  PhotoSection,
  type ChecklistItemData,
} from '../../../components/inspection-parts';
import { ConclusionStep, type VerdictOption } from '../../../components/inspection-steps';

import { forkliftSchema } from '../../../lib/inspection/schemas/forklift';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { friendlyError } from '../../../lib/errorMap';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoPicker } from '../../../hooks/usePhotoPicker';
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import {
  FORKLIFT_ITEMS,
  FORKLIFT_CATEGORY_LABELS,
  FORKLIFT_VERDICT_LABEL,
  FORKLIFT_SUMMARY_CATS,
  FORKLIFT_COMPONENTS,
  FORKLIFT_TEMPLATE_ID,
  ENGINE_TYPE_LABEL,
  forkliftSubcategoryCounts,
  type ForkliftInspection,
  type ForkliftItemState,
  type ForkliftVerdict,
  type ForkliftCategory,
} from '../../../types/forklift';

// ── Step constants ────────────────────────────────────────────────────────────

const INFO_STEP       = 0;
const CHECKLIST_STEP  = 1;
const CONCLUSION_STEP = 2;
const TOTAL_STEPS     = 3;

const FORKLIFT_CATEGORIES: ForkliftCategory[] = ['A', 'B', 'C'];

const FORKLIFT_VERDICT_OPTIONS: VerdictOption<ForkliftVerdict>[] = [
  { value: 'approved', label: FORKLIFT_VERDICT_LABEL.approved, tone: 'success' },
  { value: 'limited',  label: FORKLIFT_VERDICT_LABEL.limited,  tone: 'caution' },
  { value: 'rejected', label: FORKLIFT_VERDICT_LABEL.rejected, tone: 'danger'  },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ForkliftInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { pickPhotosWithAnnotation } = usePhotoPicker();

  // Shared orchestration: loading, step+persist, autosave, complete, celebration,
  // PDF preview/download, limit notice. Type-specific bits are passed as callbacks.
  const {
    inspection, setInspection, inspectionRef,
    projectName, saving, loading, completing, celebrating, generatingPdf,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, scheduleSave,
    complete, handlePdf, buildPreview, exit, creatorName,
  } = useInspectionFlow<ForkliftInspection>({
    id,
    firstStep: INFO_STEP,
    lastStep: CONCLUSION_STEP,
    persistPrefix: 'forklift-wizard',
    templateId: FORKLIFT_TEMPLATE_ID,
    schema: forkliftSchema,
    api: forkliftApi,
    toPatch: (insp) => ({
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
    }),
    validateMissing: (insp) => {
      const missing: string[] = [];
      if (!insp.brandModel?.trim())      missing.push('მარკა / მოდელი');
      if (!insp.inventoryNumber?.trim()) missing.push('ინვენტ. / სერიული ნომერი');
      if (!insp.verdict)                 missing.push('დასკვნა');
      return missing;
    },
    autofill: (insp, { inspectorName, project }) => {
      let next = insp;
      const patch: Record<string, unknown> = {};
      if (!insp.inspectorName && inspectorName) {
        next = { ...next, inspectorName };
        if (!next.signerName) next = { ...next, signerName: inspectorName };
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
      nameLabel: 'ForkliftInspection',
      title: 'ჩანგლიანი დამტვირთველი',
      subject: 'შრომის უსაფრთხოების შემოწმება',
    },
    loadingTitle: 'შემოწმება',
  });

  // Enabled finish button + on-press field errors (see useSubmitGuard).
  const { attempted, markAttempted, reset: resetAttempted } = useSubmitGuard();

  // ── Item update helper ───────────────────────────────────────────────────────

  const updateItem = useCallback((
    itemId: number,
    patch: Partial<Pick<ForkliftItemState, 'result' | 'comment'>>,
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i => i.id === itemId ? { ...i, ...patch } : i);
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

  // ── Photo handling ───────────────────────────────────────────────────────────

  const handleAddPhoto = useCallback(async (itemId: number) => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
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
    }
  }, [pickPhotosWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

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
  }, [scheduleSave, toast, setInspection]);

  const handleAddSummaryPhoto = useCallback(async () => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
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
    }
  }, [pickPhotosWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

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
  }, [scheduleSave, toast, setInspection]);

  // ── Checklist item data builders ─────────────────────────────────────────────

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


  // ── Step navigation ───────────────────────────────────────────────────────────

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
      await complete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, complete, setStep]);

  const handlePrev = useCallback(() => {
    if (step === INFO_STEP) void exit();
    else setStep(s => s - 1);
  }, [step, exit, setStep]);

  // Clear the "attempted" error reveal whenever the step changes.
  useEffect(() => { resetAttempted(); }, [step, resetAttempted]);

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <InspectionShellSkeleton
        title="ჩანგლიანი დამტვირთველი"
        projectName={projectName ?? ''}
        step={step}
        totalSteps={TOTAL_STEPS}
        variant={
          step === CHECKLIST_STEP ? 'checklist'
            : step === CONCLUSION_STEP ? 'conclusion'
            : 'form'
        }
        fields={3}
        onClose={() => router.back()}
      />
    );
  }

  // ── Completed ─────────────────────────────────────────────────────────────────

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ჩანგლიანი დამტვირთველი"
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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <InspectionShell
        title="ჩანგლიანი დამტვირთველი"
        projectName={projectName ?? ''}
        step={step}
        totalSteps={TOTAL_STEPS}
        direction={direction}
        animate={animateSteps}
        canGoNext={canGoNext}
        isLastStep={step === CONCLUSION_STEP}
        completing={completing}
        banner={pdfLocked ? <PdfLockedBanner onDetails={() => setLimitNoticeVisible(true)} /> : undefined}
        onNext={handleNext}
        onPrev={handlePrev}
        onBlockedNext={markAttempted}
        onClose={() => router.back()}
      >

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
                    type: 'select',
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
                columns={1}
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
              {/* Component diagram - static info card */}
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

          {/* ── Step 2: Summary Table + Verdict ─────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <ConclusionStep
              verdict={inspection.verdict}
              verdictOptions={FORKLIFT_VERDICT_OPTIONS}
              verdictError={attempted && !inspection.verdict}
              onVerdictChange={v => update('verdict', v as ForkliftVerdict)}
              notes={inspection.notes ?? ''}
              onNotesChange={v => update('notes', v || null)}
              completing={completing}
              summarySection={
                <View style={{ gap: 8 }}>
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
                          <Text style={[styles.sumCountCell, c.good > 0 && styles.cntGood]}>{c.good > 0 ? c.good : '-'}</Text>
                          <Text style={[styles.sumCountCell, c.deficient > 0 && styles.cntDef]}>{c.deficient > 0 ? c.deficient : '-'}</Text>
                          <Text style={[styles.sumCountCell, c.unusable > 0 && styles.cntBad]}>{c.unusable > 0 ? c.unusable : '-'}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              }
              photoSection={
                <>
                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>ფოტოები</Text>
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
    root: { flex: 1, backgroundColor: theme.colors.background },
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
