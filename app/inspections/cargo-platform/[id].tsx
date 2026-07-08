import { useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { Selector } from '../../../components/ui/Selector';
import { InspectionShell } from '../../../components/inspection-steps/InspectionShell';
import { InspectionShellSkeleton } from '../../../components/inspection-steps/InspectionShellSkeleton';
import { EquipmentResultScreen } from '../../../features/inspection-result';
import type { ChecklistSection as ChecklistSectionData, ResultOption } from '../../../lib/inspection/schema';
import { shortCode } from '../../../lib/shared/documentName';
import {
  ChecklistSection,
  DynamicTable,
} from '../../../components/inspection-parts';
import { ConclusionStep, type VerdictOption } from '../../../components/inspection-steps';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { cargoPlatformApi } from '../../../lib/cargoPlatformService';
import { cargoPlatformSchema } from '../../../lib/inspection/schemas/cargoPlatform';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { friendlyError } from '../../../lib/errorMap';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoPicker } from '../../../hooks/usePhotoPicker';
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';

import {
  CP_ITEMS,
  CP_SECTION_LABELS,
  CP_VERDICT_LABEL,
  CARGO_PLATFORM_TEMPLATE_ID,
  buildDefaultCargoRow,
  cpTotalWeight,
  type CargoPlatformInspection,
  type CPVerdict,
  type CPResult,
  type CPItemState,
  type CPSection,
} from '../../../types/cargoPlatform';

// ── Step constants ────────────────────────────────────────────────────────────
const INFO_STEP       = 0;
const PLATFORM_STEP   = 1;
const GUARDRAIL_STEP  = 2;
const CARGO_STEP      = 3;
const CHECKLIST_STEP  = 4;
const CONCLUSION_STEP = 5;
const TOTAL_STEPS     = 6;

const CP_VERDICT_OPTIONS: VerdictOption<CPVerdict>[] = [
  { value: 'approved',    label: CP_VERDICT_LABEL.approved,    tone: 'success' },
  { value: 'conditional', label: CP_VERDICT_LABEL.conditional, tone: 'caution' },
  { value: 'rejected',    label: CP_VERDICT_LABEL.rejected,    tone: 'danger'  },
];

// Result vocabulary for the completed detail page (mirrors the PDF result pills
// in lib/inspection/schemas/cargoPlatform.ts → resultPill).
const CARGO_PLATFORM_RESULT_OPTIONS: ResultOption[] = [
  { value: 'good', label: 'კარგი',          short: 'კარგი',    mark: '✓', tone: 'good' },
  { value: 'fix',  label: 'გამოსასწორებელი', short: 'გამოსასწ.', mark: '✗', tone: 'warn' },
  { value: 'na',   label: 'N/A',            short: 'N/A',      mark: '-', tone: 'neutral' },
];

// ── Guardrail selector options (DS Selector, chips presentation) ───────────────
const GUARDRAIL_OPTIONS = [
  { value: 'none',     label: 'არ გააჩნია' },
  { value: 'complete', label: 'მოაჯირი სრულია' },
];

const GUARDRAIL_HEIGHT_OPTIONS = [
  { value: 'non_standard', label: 'ვერ აკმ. სტანდარტს' },
  { value: 'standard',     label: 'სტანდარტს აკმ.' },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CargoPlatformInspectionScreen() {
  const { t } = useTranslation();
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
    projectName, loading, completing, celebrating, generatingPdf,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, scheduleSave,
    complete, reopen, handlePdf, exit, creatorName,
  } = useInspectionFlow<CargoPlatformInspection>({
    id,
    firstStep: PLATFORM_STEP,
    lastStep: CONCLUSION_STEP,
    // v2: 5-step layout (guardrails split into their own step). Bumped so old
    // persisted positions from the 4-step layout don't restore onto the wrong
    // new step — data still loads from the DB; only the step index resets.
    persistPrefix: 'cargo-platform-wizard-v2',
    templateId: CARGO_PLATFORM_TEMPLATE_ID,
    schema: cargoPlatformSchema,
    api: cargoPlatformApi,
    toPatch: (insp) => ({
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
    }),
    validateMissing: (insp) => {
      const missing: string[] = [];
      if (!insp.verdict)                missing.push('დასკვნა');
      if (!insp.verdictComment?.trim()) missing.push('კომენტარი');
      return missing;
    },
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
      nameLabel: 'CargoPlatformInspection',
      title: 'ტვირთის მიმღები პლატფორმის შემოწმება',
      subject: 'შრომის უსაფრთხოება',
    },
    loadingTitle: 'პლატფორმის შემოწმება',
  });

  // ── Cargo rows ─────────────────────────────────────────────────────────────

  const handleCargoChange = useCallback((rows: Record<string, any>[]) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, cargo: rows as typeof prev.cargo };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

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
  }, [scheduleSave, setInspection]);

  // ── Photos ──────────────────────────────────────────────────────────────────

  const handleAddItemPhoto = useCallback(async (itemId: number) => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
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
    }
  }, [pickPhotosWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

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
  }, [scheduleSave, toast, setInspection]);

  const handleAddSummaryPhoto = useCallback(async () => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
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
    }
  }, [pickPhotosWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

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
  }, [scheduleSave, toast, setInspection]);

  // ── Step navigation ─────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === INFO_STEP) return !!(inspection.company?.trim() && inspection.address?.trim());
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !!inspection.verdictComment?.trim() && !completing;
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
    if (step === PLATFORM_STEP) {
      await exit();
    } else {
      setStep(s => s - 1);
    }
  }, [step, exit, setStep]);

  // Clear the "attempted" error reveal whenever the step changes.
  useEffect(() => { resetAttempted(); }, [step, resetAttempted]);

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
      <InspectionShellSkeleton
        title="პლატფორმის შემოწმება"
        projectName={projectName ?? ''}
        step={step - 1}
        totalSteps={TOTAL_STEPS - 1}
        variant={
          step === CARGO_STEP ? 'table'
            : step === CHECKLIST_STEP ? 'checklist'
            : step === CONCLUSION_STEP ? 'conclusion'
            : 'form'
        }
        fields={6}
        onClose={() => router.back()}
      />
    );
  }

  // ── Completed inspection detail page ───────────────────────────────────────
  if (inspection.status === 'completed' && !celebrating) {
    const verdictTone = inspection.verdict === 'approved' ? 'safe'
      : inspection.verdict === 'rejected' ? 'severe' : 'muted';
    const sections: ChecklistSectionData[] = (['A', 'B'] as CPSection[]).map((sec) => ({
      title: CP_SECTION_LABELS[sec],
      items: CP_ITEMS
        .filter((e) => e.section === sec)
        .map((entry) => {
          const st = inspection.items.find((i) => i.id === entry.id);
          return {
            id: entry.id,
            label: entry.label,
            description: entry.description,
            result: st?.result ?? null,
            comment: st?.comment ?? null,
            photoPaths: st?.photo_paths ?? [],
          };
        }),
    }));

    return (
      <EquipmentResultScreen
        flow={{ creatorName, reopen, handlePdf, generatingPdf, pdfLocked, limitNoticeVisible, setLimitNoticeVisible }}
        title="პლატფორმის შემოწმება"
        status={inspection.verdict ? { tone: verdictTone, label: CP_VERDICT_LABEL[inspection.verdict] } : null}
        info={[
          { label: t('details.info.project'), value: inspection.company || '—' },
          { label: t('details.info.location'), value: inspection.address || '—' },
          { label: 'სართული / ზონა', value: inspection.floorZone || '—' },
          { label: 'პლატფორმის ტიპი / მოდელი', value: inspection.platformTypeModel || '—' },
          { label: t('details.info.date'), value: new Date(inspection.inspectionDate).toLocaleDateString('ka-GE') },
          { label: t('details.info.expert'), value: inspection.inspectorName || creatorName || '—' },
          { label: t('details.info.code'), value: shortCode(inspection.id) },
        ]}
        sections={sections}
        resultOptions={CARGO_PLATFORM_RESULT_OPTIONS}
        notes={inspection.verdictComment}
        summaryPhotos={inspection.summaryPhotos ?? []}
      />
    );
  }

  return (
    <View style={styles.root}>
      <InspectionShell
        title="პლატფორმის შემოწმება"
        projectName={projectName ?? ''}
        step={step - 1}
        totalSteps={TOTAL_STEPS - 1}
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

              <FloatingLabelInput
                label="პლატფორმის ტიპი / მოდელი"
                value={inspection.platformTypeModel}
                onChangeText={v => update('platformTypeModel', v)}
              />

              <FloatingLabelInput
                label="სიგრძე (მ)"
                value={inspection.platformLength != null ? String(inspection.platformLength) : ''}
                onChangeText={v => {
                  const n = parseFloat(v);
                  update('platformLength', isNaN(n) ? null : n);
                }}
                keyboardType="decimal-pad"
              />
              <FloatingLabelInput
                label="სიგანე (მ)"
                value={inspection.platformWidth != null ? String(inspection.platformWidth) : ''}
                onChangeText={v => {
                  const n = parseFloat(v);
                  update('platformWidth', isNaN(n) ? null : n);
                }}
                keyboardType="decimal-pad"
              />

              <FloatingLabelInput
                label="ვიზუალური აღწერა / ფერი"
                value={inspection.platformColorDesc}
                onChangeText={v => update('platformColorDesc', v)}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Guardrails ───────────────────────────────────────────── */}
          {step === GUARDRAIL_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <Selector
                label="გვერდის დამცავი მოაჯირი"
                presentation="chips"
                options={GUARDRAIL_OPTIONS}
                value={inspection.sideGuardrail}
                onChange={v => update('sideGuardrail', v as CargoPlatformInspection['sideGuardrail'])}
              />

              <Selector
                label="წინა დამცავი მოაჯირი"
                presentation="chips"
                options={GUARDRAIL_OPTIONS}
                value={inspection.frontGuardrail}
                onChange={v => update('frontGuardrail', v as CargoPlatformInspection['frontGuardrail'])}
              />

              <Selector
                label="მოაჯირის სიმაღლე (სტანდ. 90–120 სმ)"
                presentation="chips"
                options={GUARDRAIL_HEIGHT_OPTIONS}
                value={inspection.guardrailHeight}
                onChange={v => update('guardrailHeight', v as CargoPlatformInspection['guardrailHeight'])}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 3: Cargo table ──────────────────────────────────────────── */}
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

          {/* ── Step 4: Checklist ────────────────────────────────────────────── */}
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

          {/* ── Step 5: Conclusion ───────────────────────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <ConclusionStep
              verdict={inspection.verdict}
              verdictOptions={CP_VERDICT_OPTIONS}
              verdictLayout="vertical"
              verdictError={attempted && !inspection.verdict}
              onVerdictChange={v => update('verdict', v as CPVerdict)}
              notes={inspection.verdictComment}
              onNotesChange={v => update('verdictComment', v)}
              notesRequired
              notesError={attempted && !inspection.verdictComment?.trim()}
              photoPaths={inspection.summaryPhotos}
              onAddPhoto={handleAddSummaryPhoto}
              onDeletePhoto={handleDeleteSummaryPhoto}
              photoLabel="ფოტო / ვიდეო მასალა (სურვ.)"
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
    root: { flex: 1, backgroundColor: theme.colors.background },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 24, paddingTop: 4 },
    stepBody: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 },
    footer: { gap: 10, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, backgroundColor: theme.colors.card },


    sectionHint: { fontSize: 12, color: theme.colors.inkSoft, fontStyle: 'italic', lineHeight: 18 },

    // Cargo total
    totalLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.ink },
    totalValue: { fontSize: 18, fontWeight: '800', color: theme.colors.accent },
  });
}
