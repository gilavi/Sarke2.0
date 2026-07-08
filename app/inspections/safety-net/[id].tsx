import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { InspectionShell } from '../../../components/inspection-steps/InspectionShell';
import { InspectionShellSkeleton } from '../../../components/inspection-steps/InspectionShellSkeleton';
import { EquipmentResultScreen } from '../../../features/inspection-result';
import {
  ChecklistSection,
  DynamicTable,
  PhotoSection,
  IdentificationGrid,
} from '../../../components/inspection-parts';
import { ConclusionStep, type VerdictOption } from '../../../components/inspection-steps';
import type { ChecklistSection as ResultChecklistSection, ResultOption } from '../../../lib/inspection/schema';
import { shortCode } from '../../../lib/shared/documentName';
import { useTheme, type Theme } from '../../../lib/theme';
import { safetyNetApi } from '../../../lib/safetyNetService';
import { safetyNetSchema } from '../../../lib/inspection/schemas/safetyNet';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import { useEquipmentPhotos } from '../../../lib/inspection/useEquipmentPhotos';
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoPicker } from '../../../hooks/usePhotoPicker';
import {
  SN_VISUAL_ITEMS,
  SN_POST_TEST_ITEMS,
  SN_VERDICT_LABEL,
  SAFETY_NET_TEMPLATE_ID,
  buildDefaultSNLoadTestRow,
  snTotalWeight,
  type SafetyNetInspection,
  type SNVerdict,
  type SNResult,
  type SNPostResult,
} from '../../../types/safetyNet';

// ── Step constants ────────────────────────────────────────────────────────────
// Net identification is split across two screens (it had too many inputs for
// one). The old single "inspection" step is split into the visual questionnaire
// and the load-test sections. The old documents/photos step is gone — its
// qual-doc + photo material moved onto the conclusion step.
const NET_DATA_STEP   = 1; // net fields
const NET_POSTS_STEP  = 2; // posts / anchors counts
const VISUAL_STEP     = 3; // visual checklist (questionnaire)
const LOAD_TEST_STEP  = 4; // load-test table + post-test checklist
const CONCLUSION_STEP = 5; // verdict + comment + qual-doc + photos
const TOTAL_STEPS     = 5;

const SN_VERDICT_OPTIONS: VerdictOption<SNVerdict>[] = [
  { value: 'pass', label: SN_VERDICT_LABEL.pass, tone: 'success' },
  { value: 'fail', label: SN_VERDICT_LABEL.fail, tone: 'danger'  },
];

// Result vocabulary for the completed detail page (mirrors the PDF result pills).
// Combines the visual-checklist results (good/fix/na) and the post-test
// pass/fail results — `EquipmentChecklistContent` resolves each item's result
// against this single map.
const SAFETY_NET_RESULT_OPTIONS: ResultOption[] = [
  { value: 'good', label: 'კარგი',      short: 'კარგი',     tone: 'good'    },
  { value: 'fix',  label: 'გამოსასწ.',  short: 'გამოსასწ.', tone: 'warn'    },
  { value: 'na',   label: 'N/A',         short: 'N/A',        tone: 'neutral' },
  { value: 'pass', label: 'გამოც.',     short: 'გამოც.',    tone: 'good'    },
  { value: 'fail', label: 'პრობლ.',     short: 'პრობლ.',    tone: 'bad'     },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SafetyNetInspectionScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { pickPhotosWithAnnotation } = usePhotoPicker();

  // Shared orchestration: loading, step+persist, autosave, complete, celebration,
  // PDF preview/download, limit notice. Type-specific bits are passed as callbacks so
  // behaviour matches the pre-refactor screen exactly.
  const {
    inspection, setInspection, inspectionRef,
    projectName, loading, completing, celebrating, generatingPdf,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, scheduleSave,
    complete, reopen, handlePdf, exit, creatorName,
  } = useInspectionFlow<SafetyNetInspection>({
    id,
    firstStep: NET_DATA_STEP,
    lastStep: CONCLUSION_STEP,
    persistPrefix: 'safety-net-wizard',
    templateId: SAFETY_NET_TEMPLATE_ID,
    schema: safetyNetSchema,
    api: safetyNetApi,
    toPatch: (insp) => ({
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
    }),
    validateMissing: (insp) => (insp.verdict ? [] : ['დასკვნა']),
    autofill: (insp, { inspectorName, project }) => {
      let next = insp;
      const patch: Record<string, unknown> = {};
      if (!insp.inspectorName && inspectorName) {
        next = { ...next, inspectorName };
        const sigs = [...next.signatures];
        if (!sigs[0].name) sigs[0] = { ...sigs[0], name: inspectorName };
        next = { ...next, signatures: sigs };
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
      nameLabel: 'SafetyNetInspection',
      title: 'უსაფრთხოების ბადის შემოწმების აქტი',
      subject: 'შრომის უსაფრთხოება',
    },
    loadingTitle: 'ბადის შემოწმება',
  });

  // Enabled finish button + on-press field errors (see useSubmitGuard).
  const { attempted, markAttempted, reset: resetAttempted } = useSubmitGuard();

  // ── Items ───────────────────────────────────────────────────────────────────

  const updateItem = useCallback((itemId: number, patch: { result?: SNResult | null; comment?: string | null }) => {
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i => i.id === itemId ? { ...i, ...patch } : i);
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

  const updatePostTestItem = useCallback((itemId: number, result: SNPostResult | null) => {
    setInspection(prev => {
      if (!prev) return prev;
      const postTestItems = prev.postTestItems.map(i => i.id === itemId ? { ...i, result } : i);
      const next = { ...prev, postTestItems };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

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
  }, [scheduleSave, setInspection]);

  // ── Photos (shared quartet) ─────────────────────────────────────────────────

  const {
    handleAddItemPhoto,
    handleDeleteItemPhoto,
    handleAddSummaryPhoto,
    handleDeleteSummaryPhoto,
  } = useEquipmentPhotos<SafetyNetInspection, number>({
    inspectionRef, setInspection, scheduleSave,
    pickPhotos: pickPhotosWithAnnotation,
    uploadItemPhoto: (inspectionId, itemId, uri) => safetyNetApi.uploadPhoto(inspectionId, itemId, uri),
    uploadSummaryPhoto: (inspectionId, uri) => safetyNetApi.uploadPhoto(inspectionId, 'summary', uri),
    deletePhoto: safetyNetApi.deletePhoto,
    updateItemPaths: (insp, itemId, update) => ({
      ...insp,
      items: insp.items.map(i =>
        i.id === itemId ? { ...i, photo_paths: update(i.photo_paths ?? []) } : i,
      ),
    }),
  });

  // ── Step navigation ─────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === CONCLUSION_STEP) return !!inspection.verdict;
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, inspection]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await complete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, complete, setStep]);

  const handlePrev = useCallback(async () => {
    if (step === NET_DATA_STEP) {
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
        title="ბადის შემოწმება"
        projectName={projectName ?? ''}
        step={step - 1}
        totalSteps={TOTAL_STEPS}
        variant={
          step === VISUAL_STEP || step === LOAD_TEST_STEP ? 'checklist'
            : step === CONCLUSION_STEP ? 'conclusion'
            : 'form'
        }
        fields={5}
        verdicts={2}
        photos={false}
        onClose={() => router.back()}
      />
    );
  }

  // ── Completed inspection detail page ───────────────────────────────────────
  if (inspection.status === 'completed' && !celebrating) {
    const verdictTone = inspection.verdict === 'fail' ? 'severe' : 'safe';
    const sections: ResultChecklistSection[] = [
      {
        title: 'ვიზუალური შემოწმება',
        items: SN_VISUAL_ITEMS.map((entry) => {
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
      },
      {
        title: 'ტვირთის ჩაგდების შემდეგ შემოწმება',
        items: SN_POST_TEST_ITEMS.map((entry) => {
          const st = inspection.postTestItems.find((i) => i.id === entry.id);
          return {
            id: entry.id,
            label: entry.label,
            result: st?.result ?? null,
          };
        }),
      },
    ];

    return (
      <EquipmentResultScreen
        flow={{ creatorName, reopen, handlePdf, generatingPdf, pdfLocked, limitNoticeVisible, setLimitNoticeVisible }}
        title="ბადის შემოწმება"
        status={inspection.verdict ? { tone: verdictTone, label: SN_VERDICT_LABEL[inspection.verdict] } : null}
        info={[
          { label: t('details.info.project'), value: inspection.company || '—' },
          { label: 'მწარმოებელი', value: inspection.manufacturer || '—' },
          { label: 'ბადის ზომა', value: inspection.netSize || '—' },
          { label: t('details.info.date'), value: new Date(inspection.inspectionDate).toLocaleDateString('ka-GE') },
          { label: t('details.info.expert'), value: inspection.inspectorName || creatorName || '—' },
          { label: t('details.info.code'), value: shortCode(inspection.id) },
        ]}
        sections={sections}
        resultOptions={SAFETY_NET_RESULT_OPTIONS}
        notes={inspection.verdictComment}
        summaryPhotos={inspection.summaryPhotos}
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <InspectionShell
        title="ბადის შემოწმება"
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

          {/* ── Step 1: Net data ─────────────────────────────────────────────── */}
          {step === NET_DATA_STEP && (
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
                  { label: 'უჯრედის მხარე', value: inspection.cellSide, onChange: v => update('cellSide', v) },
                  { label: 'სამუშაო მანძილი', value: inspection.workingDistance, onChange: v => update('workingDistance', v) },
                  {
                    label: 'ბადის სერტიფიკატი',
                    value: inspection.certificate ?? '',
                    type: 'chips',
                    options: ['none', 'active', 'expired'],
                    optionLabels: ['არ გააჩნია', 'მოქმედია', 'ვადაგასულია'],
                    onChange: v => update('certificate', v as SafetyNetInspection['certificate']),
                    isProblematic: inspection.certificate === 'expired' || inspection.certificate === 'none',
                  },
                ]}
                columns={1}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Posts & anchors ──────────────────────────────────────── */}
          {step === NET_POSTS_STEP && (
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
                  { label: 'დგარის ზომა', value: inspection.postSize, onChange: v => update('postSize', v) },
                  { label: 'დგარების რ-ბა', value: inspection.postCount != null ? String(inspection.postCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('postCount', isNaN(n) ? null : n); } },
                  { label: 'დგარის სამაგრების რ-ბა', value: inspection.postAnchorCount != null ? String(inspection.postAnchorCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('postAnchorCount', isNaN(n) ? null : n); } },
                  { label: 'სამაგრი წერტილების რ-ბა', value: inspection.anchorPointCount != null ? String(inspection.anchorPointCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('anchorPointCount', isNaN(n) ? null : n); } },
                  { label: 'კიდის ბაგირების რ-ბა', value: inspection.edgeRopeCount != null ? String(inspection.edgeRopeCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('edgeRopeCount', isNaN(n) ? null : n); } },
                ]}
                columns={1}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 3: Visual checklist (questionnaire) ─────────────────────── */}
          {step === VISUAL_STEP && (
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
                onItemChange={(itemId, field, val) => {
                  if (field === 'value') {
                    const result: SNResult | null = val === 'N/A' ? 'na' : val as SNResult | null;
                    updateItem(itemId, { result });
                  } else {
                    updateItem(itemId, { comment: val });
                  }
                }}
                onAddPhoto={handleAddItemPhoto}
                onDeletePhoto={handleDeleteItemPhoto}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 4: Load test + post-test checklist ──────────────────────── */}
          {step === LOAD_TEST_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 8 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <Text style={styles.loadInstruction}>
                180კგ-ის სიმძიმე 1მ სიმაღლიდან - №477 დადგენილება
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
                onItemChange={(itemId, field, val) => {
                  if (field === 'value') {
                    updatePostTestItem(itemId, val as SNPostResult | null);
                  }
                }}
                onAddPhoto={() => {}}
                onDeletePhoto={() => {}}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 5: Conclusion + docs & photos ───────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <ConclusionStep
              verdict={inspection.verdict}
              verdictOptions={SN_VERDICT_OPTIONS}
              verdictError={attempted && !inspection.verdict}
              onVerdictChange={v => update('verdict', v as SNVerdict)}
              notes={inspection.verdictComment ?? ''}
              onNotesChange={v => update('verdictComment', v)}
              completing={completing}
              photoSection={
                <View style={styles.docBlock}>
                  <Text style={styles.fieldLabel}>ფოტო / ვიდეო მასალა (სურვ.)</Text>
                  <PhotoSection
                    photoPaths={inspection.summaryPhotos}
                    onAdd={handleAddSummaryPhoto}
                    onDelete={handleDeleteSummaryPhoto}
                  />
                </View>
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
    stepBody: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 },
    footer: { gap: 10, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, backgroundColor: theme.colors.card },

    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    docBlock: { gap: 8 },

    loadInstruction: {
      fontSize: 11, color: theme.colors.inkSoft, fontStyle: 'italic',
      backgroundColor: theme.colors.warnSoft,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 6, borderLeftWidth: 3, borderLeftColor: theme.colors.warn,
    },

    totalLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.ink },
    totalValue: { fontSize: 18, fontWeight: '800', color: theme.colors.accent },
  });
}
