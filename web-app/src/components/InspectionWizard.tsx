import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NumberInput } from '@mantine/core';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

import PhotoUploadZone from '@/components/PhotoUploadZone';
import SuccessModal, { type SuccessModalData } from '@/components/web/SuccessModal';
import { inspectionDisplayName } from '@/lib/documentNames';
import { WizardFrame, WizardSidebar, SegmentedControl } from '@/components/wizard';
import { HarnessChecklist } from '@/components/inspections/HarnessChecklist';
import { useAuth } from '@/lib/auth';
import {
  addAnswerPhoto,
  createInspection,
  listAnswerPhotos,
  listQuestions,
  removeAnswerPhoto,
  updateInspection,
  upsertAnswer,
  type Answer,
  type Inspection,
  type Question,
} from '@/lib/data/inspections';
import { listProjects } from '@/lib/data/projects';
import { listTemplates } from '@/lib/data/templates';
import { projectKeys, inspectionKeys, templateKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { VERDICT_GOOD, VERDICT_BAD } from '@/lib/verdictColors';
import { toastError } from '@/lib/errors';

/* ─── Types ─── */

type WizardMode = 'create' | 'edit';

/**
 * Locks the wizard to a single template for a streamlined, type-specific create
 * flow (e.g. harness): the info step shows only the project picker, the inspector
 * is taken from the signed-in profile, and on success the wizard navigates to the
 * type's detail route. Pass this instead of mounting a bespoke per-type modal.
 */
export interface WizardPreset {
  templateId: string;
  title?: string;
  requireConclusionText?: boolean;
  successDetailRoute?: (id: string) => string;
  /** Noun shown in the success modal stat line, e.g. "ქამარი", "მოწყობილობა". */
  itemLabel?: string;
}

interface InspectionWizardProps {
  open: boolean;
  onClose: () => void;
  // Creation mode
  defaultProjectId?: string;
  defaultCategory?: string;
  /** Locked, streamlined single-template create flow (e.g. harness). */
  preset?: WizardPreset;
  // Edit mode
  inspection?: Inspection;
  initialQuestions?: Question[];
  initialAnswers?: Answer[];
  onComplete?: () => void;
}

/* freetext + photo_upload questions are redundant in harness flows
   (covered by HarnessWizard + ConclusionStep, which has its own photo upload) */
function filterQuestions(qs: Question[]): Question[] {
  const hasGrid = qs.some((q) => q.type === 'component_grid');
  return hasGrid ? qs.filter((q) => q.type !== 'freetext' && q.type !== 'photo_upload') : qs;
}

/* Categories whose flow is a plain yes/no questionnaire — the repeatable
   `component_grid` step is not part of the act (unlike harness, where the grid IS
   the inspection). The façade-scaffold family inspects via the section questions
   shown on the detail screen, so the grid step is dropped from their wizard. */
const GRID_DROP_CATEGORIES = new Set(['xaracho', 'mobile_scaffold', 'mobile_scaffold_n3']);

/* Repeatable-grid item noun per template category. Harness = belts ("ქამარი");
   the façade-scaffold family inspects scaffolds ("ხარაჩო"). Unknown categories
   fall back to a neutral noun at the callsite. */
const GRID_ITEM_NOUN: Record<string, string> = {
  harness: 'ქამარი',
  xaracho: 'ხარაჩო',
  mobile_scaffold: 'ხარაჩო',
  mobile_scaffold_n3: 'ხარაჩო',
};

/* ─── Component ─── */

export default function InspectionWizard({
  open,
  onClose,
  defaultProjectId = '',
  defaultCategory = '',
  preset,
  inspection: existingInspection,
  initialQuestions = [],
  initialAnswers = [],
  onComplete,
}: InspectionWizardProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null;
  const mode: WizardMode = existingInspection ? 'edit' : 'create';

  /* ── Info form state (creation only) ── */
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [templateId, setTemplateId] = useState(preset?.templateId ?? '');
  const [harnessName, setHarnessName] = useState('');
  const [department, setDepartment] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [creating, setCreating] = useState(false);

  /* ── Created inspection (after step 0) ── */
  const [createdInspection, setCreatedInspection] = useState<Inspection | null>(existingInspection ?? null);

  /* ── Questions & answers ── */
  const [questions, setQuestions] = useState<Question[]>(() => filterQuestions(initialQuestions));
  const [answerMap, setAnswerMap] = useState<Record<string, Partial<Answer>>>(() => {
    const map: Record<string, Partial<Answer>> = {};
    for (const a of initialAnswers) map[a.question_id] = a;
    return map;
  });

  /* ── Navigation ── */
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  /* ── Success modal (shown after completion, survives the wizard closing) ── */
  const [successData, setSuccessData] = useState<SuccessModalData | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [completedId, setCompletedId] = useState<string | null>(null);

  /* ── Harness (component_grid) UI state, lifted so the shared sidebar persists
     across the checklist and conclusion steps ── */
  const [harnessAddedCount, setHarnessAddedCount] = useState(1);
  const [harnessActiveIdx, setHarnessActiveIdx] = useState(0);
  const [harnessNaSet, setHarnessNaSet] = useState<Set<string>>(new Set());

  /* ── Conclusion ── */
  const [conclusion, setConclusion] = useState({
    isSafe: existingInspection?.is_safe_for_use ?? null as boolean | null,
    text: existingInspection?.conclusion_text ?? '',
  });
  const [conclusionPhotos, setConclusionPhotos] = useState<string[]>(
    existingInspection?.conclusion_photo_paths ?? [],
  );

  /* ── Data queries ── */
  const { data: projects } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects, enabled: open && mode === 'create' });
  const { data: templates } = useQuery({ queryKey: templateKeys.lists(), queryFn: listTemplates, enabled: open && mode === 'create' });

  /* Resolve the template for a defaultCategory (e.g. xaracho façade scaffold) flow.
     Matches the category first; falls back to a façade name-match because the live
     façade-scaffold template's category may not be the literal 'xaracho' string
     (the mobile-scaffold templates also contain "ხარაჩო", so we key on "ფასად"). */
  const defaultCategoryTemplateId = useMemo(() => {
    if (!defaultCategory || !templates || templates.length === 0) return '';
    const byCategory = templates.find((t) => t.category === defaultCategory);
    if (byCategory) return byCategory.id;
    if (defaultCategory === 'xaracho') {
      const byName = templates.find((t) => /ფასად/.test(t.name));
      if (byName) return byName.id;
    }
    return '';
  }, [defaultCategory, templates]);

  /* The template the info step will actually create with: an explicitly-picked
     one, else the preset's, else the resolved default-category one. Derived (no
     effect/setState) so a defaultCategory flow needs no extra render and the
     "next" button is enabled as soon as the project is chosen. */
  const resolvedTemplateId = templateId || preset?.templateId || defaultCategoryTemplateId;

  const effectiveInspection = createdInspection;


  /* ── Reset on open ── */
  const hasResetRef = useRef(false);
  useEffect(() => {
    if (open && !hasResetRef.current) {
      hasResetRef.current = true;
      setProjectId(defaultProjectId);
      setTemplateId(preset?.templateId ?? '');
      setHarnessName('');
      setDepartment('');
      setInspectorName('');
      setCreatedInspection(existingInspection ?? null);
      setQuestions(filterQuestions(initialQuestions));
      setAnswerMap(() => {
        const map: Record<string, Partial<Answer>> = {};
        for (const a of initialAnswers) map[a.question_id] = a;
        return map;
      });
      setStepIndex(0);
      setDirection(1);
      setSubmitting(false);
      setSuccessData(null);
      setSuccessOpen(false);
      setCompletedId(null);
      setHarnessActiveIdx(0);
      setHarnessNaSet(new Set());
      // Reveal every item that already holds data (resumed inspection); always ≥1.
      const initGrid = filterQuestions(initialQuestions).find((q) => q.type === 'component_grid');
      let initAdded = 1;
      if (initGrid) {
        const gv = initialAnswers.find((a) => a.question_id === initGrid.id)?.grid_values ?? {};
        const sc = (initGrid.grid_cols ?? []).filter((c) => c !== 'კომენტარი');
        let last = 0;
        (initGrid.grid_rows ?? []).forEach((row, i) => {
          if (sc.some((c) => (gv[row]?.[c] ?? '') !== '')) last = i + 1;
        });
        initAdded = Math.max(1, last);
      }
      setHarnessAddedCount(initAdded);
      setConclusion({
        isSafe: existingInspection?.is_safe_for_use ?? null,
        text: existingInspection?.conclusion_text ?? '',
      });
      setConclusionPhotos(existingInspection?.conclusion_photo_paths ?? []);
    }
    if (!open) {
      hasResetRef.current = false;
    }
  }, [open, existingInspection, initialQuestions, initialAnswers, defaultProjectId, preset]);

  /* ── Step flattening ── */
  const infoStepCount = mode === 'create' ? 1 : 0;
  const conclusionStepCount = 1;
  const questionCount = questions.length;
  const totalSteps = infoStepCount + questionCount + conclusionStepCount;

  const isInfoStep = mode === 'create' && stepIndex === 0;
  const isQuestionStep = stepIndex >= infoStepCount && stepIndex < infoStepCount + questionCount;
  const isConclusionStep = stepIndex === infoStepCount + questionCount;

  const currentQuestion = isQuestionStep ? questions[stepIndex - infoStepCount] : undefined;
  const currentAnswer = currentQuestion ? answerMap[currentQuestion.id] : undefined;
  const isHarnessGridStep = isQuestionStep && currentQuestion?.type === 'component_grid';

  const progressPercent = totalSteps > 1 ? ((stepIndex) / (totalSteps - 1)) * 100 : 0;

  /* ── Mutations ── */
  const answerMutation = useMutation({
    mutationFn: async (params: {
      inspectionId: string;
      questionId: string;
      valueBool?: boolean | null;
      valueNum?: number | null;
      valueText?: string | null;
      gridValues?: Record<string, Record<string, string>> | null;
      comment?: string | null;
    }) => {
      return upsertAnswer(params);
    },
    onSuccess: (answer) => {
      setAnswerMap((prev) => ({ ...prev, [answer.question_id]: answer }));
    },
    onError: (e) => toastError(e),
  });

  /* ── Grid summary (ok/bad counts) — shown for any component_grid inspection ── */
  const gridSummary = useMemo(() => {
    const gridQ = questions.find((q) => q.type === 'component_grid');
    if (!gridQ) return null;
    const gridVals = answerMap[gridQ.id]?.grid_values ?? {};
    const statusCols = (gridQ.grid_cols ?? []).filter((c) => c !== 'კომენტარი');
    const evaluated = Object.entries(gridVals).filter(([, cols]) =>
      statusCols.some((c) => cols[c] === 'ok' || cols[c] === 'bad'),
    );
    if (evaluated.length === 0) return null;
    const bad = evaluated.filter(([, cols]) => statusCols.some((c) => cols[c] === 'bad')).length;
    return { total: evaluated.length, ok: evaluated.length - bad, bad };
  }, [questions, answerMap]);

  const projectName = useMemo(
    () => (projects ?? []).find((p) => p.id === projectId)?.name ?? '',
    [projects, projectId],
  );

  /* ── Navigation handlers ── */
  const goNext = useCallback(async () => {
    if (isConclusionStep) {
      setSubmitting(true);
      try {
        const insId = effectiveInspection!.id;
        await updateInspection(insId, {
          status: 'completed',
          conclusion_text: conclusion.text || null,
          is_safe_for_use: conclusion.isSafe,
          conclusion_photo_paths: conclusionPhotos,
        });
        setCreatedInspection((prev) =>
          prev
            ? {
                ...prev,
                status: 'completed',
                conclusion_text: conclusion.text || null,
                is_safe_for_use: conclusion.isSafe,
                conclusion_photo_paths: conclusionPhotos,
                completed_at: new Date().toISOString(),
              }
            : prev,
        );
        qc.invalidateQueries({ queryKey: inspectionKeys.detail(insId) });
        qc.invalidateQueries({ queryKey: inspectionKeys.lists() });
        onComplete?.();
        const successPayload: SuccessModalData = {
          totalCount: gridSummary?.total ?? 0,
          safeCount: gridSummary?.ok ?? 0,
          problemCount: gridSummary?.bad ?? 0,
          inspectionName: preset?.title ?? 'შემოწმება',
          projectName,
          itemLabel: preset?.itemLabel ?? 'ერთეული',
        };
        if (preset?.successDetailRoute) {
          // Navigate to the detail page and let it own the success modal, so the
          // confirmation appears on top of the completed inspection.
          onClose();
          navigate(preset.successDetailRoute(insId), { state: { inspectionSuccess: successPayload } });
        } else if (mode === 'create') {
          // Generic create: land on the inspection's detail page with the success
          // modal — uniform with the harness/equipment flows.
          onClose();
          navigate(routes.inspections.detail(insId), { state: { inspectionSuccess: successPayload } });
        } else {
          // Edit-in-place (detail-page wizard) — show the success modal over the detail.
          setCompletedId(insId);
          setSuccessData(successPayload);
          setSuccessOpen(true);
        }
      } catch (e) {
        toastError(e);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (isQuestionStep && currentQuestion && currentAnswer) {
      const hasValue =
        currentAnswer.value_bool !== undefined ||
        currentAnswer.value_num !== undefined ||
        currentAnswer.value_text !== undefined ||
        currentAnswer.grid_values !== undefined ||
        currentAnswer.comment !== undefined;
      if (hasValue) {
        await answerMutation.mutateAsync({
          inspectionId: effectiveInspection!.id,
          questionId: currentQuestion.id,
          valueBool: currentAnswer.value_bool ?? null,
          valueNum: currentAnswer.value_num ?? null,
          valueText: currentAnswer.value_text ?? null,
          gridValues: currentAnswer.grid_values ?? null,
          comment: currentAnswer.comment ?? null,
        });
      }
    }

    // Creation: step 0 → create inspection + fetch questions
    if (isInfoStep) {
      const createTemplateId = resolvedTemplateId;
      if (!projectId || !createTemplateId) return;
      setCreating(true);
      try {
        const created = await createInspection({
          projectId,
          templateId: createTemplateId,
          harnessName: harnessName.trim() || null,
          department: department.trim() || null,
          inspectorName: preset ? (profileName ?? null) : (inspectorName.trim() || null),
        });
        qc.invalidateQueries({ queryKey: inspectionKeys.lists() });
        const qs = await listQuestions(created.template_id);
        const cat = (templates ?? []).find((t) => t.id === created.template_id)?.category ?? defaultCategory;
        let qsFiltered = filterQuestions(qs);
        if (GRID_DROP_CATEGORIES.has(cat)) {
          qsFiltered = qsFiltered.filter((q) => q.type !== 'component_grid');
        }
        setCreatedInspection(created);
        setQuestions(qsFiltered);
        setDirection(1);
        setStepIndex(1);
      } catch (e) {
        toastError(e);
      } finally {
        setCreating(false);
      }
      return;
    }

    setDirection(1);
    setStepIndex((i) => Math.min(totalSteps - 1, i + 1));
  }, [
    isConclusionStep, isQuestionStep, isInfoStep,
    effectiveInspection, conclusion, conclusionPhotos, currentQuestion, currentAnswer,
    projectId, templateId, harnessName, department, inspectorName,
    answerMutation, qc, totalSteps, preset, profileName,
    onComplete, gridSummary, projectName, onClose, navigate, mode,
    templates, defaultCategory, resolvedTemplateId,
  ]);

  const goPrev = useCallback(() => {
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepIndex((i) => Math.max(0, i - 1));
  }, [stepIndex]);

  const handleAnswerChange = useCallback((patch: Partial<Answer>) => {
    if (!currentQuestion) return;
    setAnswerMap((prev) => ({
      ...prev,
      [currentQuestion.id]: { ...(prev[currentQuestion.id] ?? {}), ...patch },
    }));
  }, [currentQuestion]);

  /* ── Step validation ── */
  const canGoNext = useMemo(() => {
    if (isConclusionStep) return conclusion.isSafe !== null && (!preset?.requireConclusionText || conclusion.text.trim().length > 0);
    if (isInfoStep) return !!projectId && !!resolvedTemplateId;
    if (!currentQuestion) return false;
    const a = answerMap[currentQuestion.id];
    if (!a) return false;
    switch (currentQuestion.type) {
      case 'yesno': return a.value_bool !== null && a.value_bool !== undefined;
      case 'measure': return a.value_num !== null && a.value_num !== undefined;
      case 'freetext': return !!a.value_text;
      case 'photo_upload': return true;
      case 'component_grid': return !!a.grid_values && Object.keys(a.grid_values).length > 0;
      default: return false;
    }
  }, [isConclusionStep, isInfoStep, currentQuestion, answerMap, conclusion, projectId, templateId, resolvedTemplateId, preset]);

  /* ── Photo handling ── */
  const photosQ = useQuery({
    queryKey: inspectionKeys.answerPhotos(currentAnswer?.id),
    queryFn: () => listAnswerPhotos(currentAnswer!.id!),
    enabled: currentQuestion?.type === 'photo_upload' && !!currentAnswer?.id,
  });

  const photoPaths = photosQ.data?.map((p) => p.storage_path) ?? [];

  const handlePhotoAdd = useCallback(async (path: string) => {
    if (!currentAnswer?.id) return;
    await addAnswerPhoto(currentAnswer.id, path, null);
    qc.invalidateQueries({ queryKey: inspectionKeys.answerPhotos(currentAnswer.id) });
  }, [currentAnswer, qc]);

  const handlePhotoRemove = useCallback(async (path: string) => {
    if (!currentAnswer?.id) return;
    await removeAnswerPhoto(currentAnswer.id, path);
    qc.invalidateQueries({ queryKey: inspectionKeys.answerPhotos(currentAnswer.id) });
  }, [currentAnswer, qc]);

  useEffect(() => {
    if (currentQuestion?.type === 'photo_upload' && !currentAnswer?.id && !answerMutation.isPending) {
      answerMutation.mutate({ inspectionId: effectiveInspection!.id, questionId: currentQuestion.id });
    }
  }, [currentQuestion, currentAnswer, answerMutation, effectiveInspection]);

  /* ── Harness (component_grid) derived values + handlers ── */
  const gridQuestion = useMemo(() => questions.find((q) => q.type === 'component_grid'), [questions]);
  const harnessRows = useMemo(() => gridQuestion?.grid_rows ?? [], [gridQuestion]);
  const harnessStatusCols = useMemo(
    () => (gridQuestion?.grid_cols ?? []).filter((c) => c !== 'კომენტარი'),
    [gridQuestion],
  );
  const harnessHasComment = !!gridQuestion?.grid_cols?.includes('კომენტარი');
  const gridValues = useMemo<Record<string, Record<string, string>>>(
    () => (gridQuestion ? answerMap[gridQuestion.id]?.grid_values : undefined) ?? {},
    [gridQuestion, answerMap],
  );

  /* Item noun for the repeatable-grid sidebar. Harness inspects belts ("ქამარი");
     the generic façade-scaffold (xaracho) family inspects scaffolds, so derive
     the noun from the template category instead of leaking belt terminology. */
  const gridCategory = preset
    ? 'harness'
    : ((templates ?? []).find((t) => t.id === templateId)?.category ?? defaultCategory);
  const harnessItemLabel = preset?.itemLabel ?? GRID_ITEM_NOUN[gridCategory] ?? 'ერთეული';
  const harnessItemPlural = harnessItemLabel === 'ქამარი' ? 'ქამრები' : `${harnessItemLabel}ები`;
  const harnessCanAddMore = harnessAddedCount < harnessRows.length;
  const showSidebar = !!gridQuestion && isHarnessGridStep;
  const gridStepIndex = useMemo(() => {
    const qi = questions.findIndex((q) => q.type === 'component_grid');
    return qi >= 0 ? infoStepCount + qi : -1;
  }, [questions, infoStepCount]);

  const setGridCell = (row: string, col: string, value: string) => {
    if (!gridQuestion) return;
    setAnswerMap((prev) => {
      const cur = prev[gridQuestion.id]?.grid_values ?? {};
      const next = { ...cur, [row]: { ...(cur[row] ?? {}), [col]: value } };
      return { ...prev, [gridQuestion.id]: { ...(prev[gridQuestion.id] ?? {}), grid_values: next } };
    });
  };

  const handleHarnessSelect = (row: string, col: string, opt: 'ok' | 'bad' | 'na') => {
    const key = `${row}|${col}`;
    if (opt === 'na') {
      setGridCell(row, col, '');
      setHarnessNaSet((s) => new Set(s).add(key));
    } else {
      const cur = gridValues[row]?.[col] ?? '';
      setGridCell(row, col, cur === opt ? '' : opt);
      setHarnessNaSet((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  };

  const handleHarnessComment = (row: string, value: string) => setGridCell(row, 'კომენტარი', value);

  const goToGridStep = () => {
    if (gridStepIndex >= 0) {
      setDirection(1);
      setStepIndex(gridStepIndex);
    }
  };

  const handleHarnessSelectIdx = (i: number) => {
    setHarnessActiveIdx(i);
    goToGridStep();
  };

  const handleHarnessAdd = () => {
    if (!harnessCanAddMore) return;
    setHarnessActiveIdx(harnessAddedCount);
    setHarnessAddedCount((n) => n + 1);
    goToGridStep();
  };

  /* ── Header context (project · inspection · step) ── */
  const templateName = (templates ?? []).find((t) => t.id === resolvedTemplateId)?.name;
  const inspectionName = inspectionDisplayName(templateName || preset?.title);
  const stepName = useMemo(() => {
    const base = isInfoStep
      ? 'პროექტის არჩევა'
      : isConclusionStep
        ? 'დასკვნა'
        : isHarnessGridStep
          ? `${harnessItemLabel} ${harnessActiveIdx + 1}`
          : currentQuestion?.title ?? '';
    return isInfoStep ? base : `${base} · ${stepIndex + 1}/${totalSteps}`;
  }, [
    isInfoStep, isConclusionStep, isHarnessGridStep, harnessItemLabel, harnessActiveIdx,
    currentQuestion, stepIndex, totalSteps,
  ]);

  /* ── Success modal handlers (only used for flows without a detail route) ── */
  const handleSuccessClose = () => {
    setSuccessOpen(false);
    onClose();
  };
  const handleGeneratePDF = () => {
    if (completedId) window.open(`#/inspections/${completedId}/print`, '_blank');
  };

  if (!open && !successOpen) return null;

  return (
    <>
      <WizardFrame
        open={open}
        onClose={onClose}
        projectName={projectName}
        inspectionName={inspectionName}
        stepName={stepName}
        showProgress={!isInfoStep}
        progressPercent={progressPercent}
        closeDisabled={submitting || creating}
        stepKey={stepIndex}
        direction={direction}
        sidebar={
          showSidebar ? (
            <WizardSidebar
              heading={harnessItemPlural}
              addLabel={`ახალი ${harnessItemLabel}`}
              itemLabel={harnessItemLabel}
              rows={harnessRows}
              addedCount={harnessAddedCount}
              activeIdx={harnessActiveIdx}
              values={gridValues}
              statusCols={harnessStatusCols}
              canAddMore={harnessCanAddMore}
              onSelect={handleHarnessSelectIdx}
              onAdd={handleHarnessAdd}
            />
          ) : undefined
        }
        onBack={goPrev}
        onNext={goNext}
        backDisabled={stepIndex === 0 || submitting || creating}
        nextDisabled={!canGoNext || submitting || creating}
        nextLabel={isConclusionStep ? 'დასრულება' : 'შემდეგი'}
        nextTooltip={isConclusionStep ? 'აირჩიეთ გამოყენების ვარგისიანობა' : undefined}
        hideNextArrow={isConclusionStep}
        submitting={submitting || creating}
      >
        {isInfoStep && (
          <InfoStep
            projectId={projectId}
            setProjectId={setProjectId}
            templateId={templateId}
            setTemplateId={setTemplateId}
            harnessName={harnessName}
            setHarnessName={setHarnessName}
            department={department}
            setDepartment={setDepartment}
            inspectorName={inspectorName}
            setInspectorName={setInspectorName}
            lockTemplate={!!preset || (!!defaultCategory && !!resolvedTemplateId)}
            projects={projects ?? []}
            templates={templates ?? []}
          />
        )}

        {isQuestionStep && currentQuestion && !isHarnessGridStep && (
          <QuestionStepRenderer
            question={currentQuestion}
            answer={currentAnswer}
            onChange={handleAnswerChange}
            photoPaths={photoPaths}
            onPhotoAdd={handlePhotoAdd}
            onPhotoRemove={handlePhotoRemove}
            inspectionId={effectiveInspection!.id}
          />
        )}

        {isHarnessGridStep && gridQuestion && (
          <HarnessChecklist
            itemLabel={harnessItemLabel}
            activeIdx={harnessActiveIdx}
            activeRow={harnessRows[harnessActiveIdx] ?? ''}
            statusCols={harnessStatusCols}
            values={gridValues}
            naSet={harnessNaSet}
            hasComment={harnessHasComment}
            onSelect={handleHarnessSelect}
            onComment={handleHarnessComment}
          />
        )}

        {isConclusionStep && (
          <ConclusionStepRenderer
            conclusion={conclusion}
            onChange={setConclusion}
            summary={gridSummary}
            itemLabel={harnessItemLabel}
            inspectionId={effectiveInspection!.id}
            photos={conclusionPhotos}
            onPhotoAdd={(path) => setConclusionPhotos((prev) => [...prev, path])}
            onPhotoRemove={(path) => setConclusionPhotos((prev) => prev.filter((p) => p !== path))}
          />
        )}
      </WizardFrame>

      <SuccessModal
        isOpen={successOpen}
        onClose={handleSuccessClose}
        onGeneratePDF={handleGeneratePDF}
        data={successData ?? { totalCount: 0, safeCount: 0, problemCount: 0, inspectionName: '', projectName: '', itemLabel: '' }}
      />
    </>
  );
}

/* ─── Info Step ─── */

function InfoStep({
  projectId, setProjectId,
  templateId, setTemplateId,
  harnessName, setHarnessName,
  department, setDepartment,
  inspectorName, setInspectorName,
  projects, templates,
  lockTemplate = false,
}: {
  projectId: string; setProjectId: (v: string) => void;
  templateId: string; setTemplateId: (v: string) => void;
  harnessName: string; setHarnessName: (v: string) => void;
  department: string; setDepartment: (v: string) => void;
  inspectorName: string; setInspectorName: (v: string) => void;
  projects: { id: string; name: string; logo?: string | null; company_name?: string }[];
  templates: { id: string; name: string; is_system?: boolean }[];
  lockTemplate?: boolean;
}) {
  if (lockTemplate) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">აირჩიეთ პროექტი</p>
        <ProjectCardGrid projects={projects} projectId={projectId} setProjectId={setProjectId} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">პროექტი</p>
        <ProjectCardGrid projects={projects} projectId={projectId} setProjectId={setProjectId} />
      </div>

      <Select
        label="შაბლონი"
        required
        value={templateId}
        onChange={setTemplateId}
        options={templates.map((t) => ({ value: t.id, label: t.name + (t.is_system ? ' (სისტემური)' : '') }))}
        placeholder="— აირჩიეთ შაბლონი —"
      />

      <Input
        label="დასახელება"
        value={harnessName}
        onChange={(e) => setHarnessName(e.target.value)}
        placeholder="მაგ: ხარაჩო A"
      />

      <Input
        label="დეპარტამენტი"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        placeholder="დეპარტამენტის დასახელება"
      />

      <Input
        label="ინსპექტორის სახელი"
        value={inspectorName}
        onChange={(e) => setInspectorName(e.target.value)}
        placeholder="სახელი გვარი"
      />
    </div>
  );
}

/* ─── Project card grid (selector) ─── */

function ProjectCardGrid({
  projects,
  projectId,
  setProjectId,
}: {
  projects: { id: string; name: string; logo?: string | null; company_name?: string }[];
  projectId: string;
  setProjectId: (v: string) => void;
}) {
  if (projects.length === 0) {
    return <p className="text-sm text-neutral-400">პროექტები ვერ მოიძებნა.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {projects.map((p) => {
        const selected = projectId === p.id;
        const initials = p.name
          .split(' ')
          .slice(0, 2)
          .map((w) => w[0] ?? '')
          .join('')
          .toUpperCase();
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setProjectId(p.id)}
            className="flex items-center gap-3 rounded-xl p-3 text-left transition-colors"
            style={{
              border: selected ? '2px solid var(--brand-500)' : '1px solid var(--border-default)',
              background: selected ? 'var(--brand-50)' : 'var(--bg-card)',
            }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
              {p.logo ? <img src={p.logo} alt={p.name} className="h-full w-full object-cover" /> : initials || '?'}
            </div>
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {p.name}
              </div>
              {p.company_name && (
                <div className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {p.company_name}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Question Step Renderer ─── */

function QuestionStepRenderer({
  question, answer, onChange,
  photoPaths, onPhotoAdd, onPhotoRemove,
  inspectionId,
}: {
  question: Question;
  answer?: Partial<Answer>;
  onChange: (patch: Partial<Answer>) => void;
  photoPaths: string[];
  onPhotoAdd: (path: string) => void;
  onPhotoRemove: (path: string) => void;
  inspectionId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{question.title}</h3>
        <p className="text-sm text-neutral-500">
          {question.type === 'yesno' && 'აირჩიეთ "კი" ან "არა"'}
          {question.type === 'measure' && 'შეიყვანეთ გაზომვის მნიშვნელობა'}
          {question.type === 'freetext' && 'შეიყვანეთ ტექსტური პასუხი'}
          {question.type === 'photo_upload' && 'ატვირთეთ ფოტოები'}
          {question.type === 'component_grid' && 'შეავსეთ ბადე'}
        </p>
      </div>

      {question.type === 'yesno' && (
        <div className="grid grid-cols-2 gap-3">
          <AnswerButton selected={answer?.value_bool === true} onClick={() => onChange({ value_bool: true })} icon={<CheckCircle2 size={20} />} label="კი" variant="yes" />
          <AnswerButton selected={answer?.value_bool === false} onClick={() => onChange({ value_bool: false })} icon={<X size={20} />} label="არა" variant="no" />
        </div>
      )}

      {question.type === 'measure' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <NumberInput
              value={answer?.value_num ?? ''}
              onChange={(v) => onChange({ value_num: v === '' ? null : Number(v) })}
              placeholder="მნიშვნელობა"
              min={question.min_val ?? undefined}
              max={question.max_val ?? undefined}
              hideControls
            />
            {question.unit && <span className="shrink-0 text-sm text-neutral-500">{question.unit}</span>}
          </div>
          {question.min_val !== null && question.max_val !== null && (
            <p className="text-xs text-neutral-400">დასაშვები: {question.min_val} – {question.max_val} {question.unit || ''}</p>
          )}
        </div>
      )}

      {question.type === 'freetext' && (
        <Textarea
          value={answer?.value_text ?? ''}
          onChange={(e) => onChange({ value_text: e.target.value })}
          placeholder="შეიყვანეთ პასუხი..."
          rows={4}
        />
      )}

      {question.type === 'photo_upload' && (
        <PhotoUploadZone paths={photoPaths} prefix="inspections" inspectionId={inspectionId} itemId={question.id} onAdd={onPhotoAdd} onRemove={onPhotoRemove} />
      )}

      <Input
        label="კომენტარი (არასავალდებულო)"
        value={answer?.comment ?? ''}
        onChange={(e) => onChange({ comment: e.target.value })}
        placeholder="დამატებითი შენიშვნა"
      />
    </div>
  );
}

/* ─── Conclusion Step ─── */

function ConclusionStepRenderer({
  conclusion, onChange, inspectionId, photos, onPhotoAdd, onPhotoRemove, summary, itemLabel,
}: {
  conclusion: { isSafe: boolean | null; text: string };
  onChange: (c: { isSafe: boolean | null; text: string }) => void;
  inspectionId: string;
  photos: string[];
  onPhotoAdd: (path: string) => void;
  onPhotoRemove: (path: string) => void;
  summary: { total: number; ok: number; bad: number } | null;
  itemLabel: string;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">დასკვნა</h3>
        <p className="text-sm text-neutral-500">მიუთითეთ შემოწმების შედეგი და დასკვნა</p>
      </div>

      {/* 1 — Compact summary line */}
      {summary && (
        <div
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            marginBottom: '20px',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>შეჯამება:</span>
          <span style={{ fontWeight: 500 }}>{summary.total} {itemLabel}</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span style={{ color: 'var(--brand-500)', fontWeight: 500 }}>{summary.ok} კარგია</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span style={{ color: 'var(--danger)', fontWeight: 500 }}>{summary.bad} პრობლემა</span>
        </div>
      )}

      {/* 2 — Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* 3 — Verdict (hero) */}
      <div>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }} className="text-neutral-900 dark:text-neutral-100">
          გამოყენების ვარგისობა
        </p>
        <SegmentedControl
          fullWidth
          height={48}
          fontSize={15}
          options={[
            { label: '✓ გამოყენებადია', value: 'yes', selectedBg: VERDICT_GOOD },
            { label: '✗ არა ვარგისი', value: 'no', selectedBg: VERDICT_BAD },
          ]}
          selected={conclusion.isSafe === true ? 'yes' : conclusion.isSafe === false ? 'no' : null}
          onSelect={(v) => onChange({ ...conclusion, isSafe: v === 'yes' })}
        />
      </div>

      {/* 4 — Textarea (secondary) */}
      <Textarea
        label="კომენტარი / დასკვნა"
        value={conclusion.text}
        onChange={(e) => onChange({ ...conclusion, text: e.target.value })}
        placeholder="შეიყვანეთ დასკვნა..."
        rows={4}
      />

      {/* 5 — Photos (tertiary) */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ფოტოები</p>
        <PhotoUploadZone
          paths={photos}
          prefix="inspections"
          inspectionId={inspectionId}
          itemId="conclusion"
          onAdd={onPhotoAdd}
          onRemove={onPhotoRemove}
          placeholder="ფოტო არ არის სავალდებულო"
        />
      </div>
    </div>
  );
}

/* ─── Answer Button ─── */

function AnswerButton({ selected, onClick, icon, label, variant }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; label: string; variant: 'yes' | 'no';
}) {
  const base = variant === 'yes'
    ? selected ? 'bg-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-2' : 'bg-white text-neutral-600 hover:bg-emerald-50 hover:text-emerald-600 border border-neutral-200'
    : selected ? 'bg-red-500 text-white ring-2 ring-red-500 ring-offset-2' : 'bg-white text-neutral-600 hover:bg-red-50 hover:text-red-600 border border-neutral-200';
  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold transition-all ${base} dark:ring-offset-neutral-900`}>
      {icon}{label}
    </motion.button>
  );
}

