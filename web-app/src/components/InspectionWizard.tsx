import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NumberInput, Textarea, TextInput } from '@mantine/core';
import { Select } from '@/components/ui/select';
import { ProjectPicker } from '@/components/ui/project-picker';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import InspectionSuccessCard from '@/components/InspectionSuccessCard';
import HarnessWizard from '@/components/inspections/HarnessWizard';
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

/* ─── Animation variants ─── */

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, damping: 28, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 32 };

/* freetext questions are redundant in harness flows (covered by HarnessWizard + ConclusionStep) */
function filterQuestions(qs: Question[]): Question[] {
  const hasGrid = qs.some((q) => q.type === 'component_grid');
  return hasGrid ? qs.filter((q) => q.type !== 'freetext') : qs;
}

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

  /* ── Auto-select template from defaultCategory ── */
  useEffect(() => {
    if (mode === 'create' && defaultCategory && templates && templates.length > 0 && !templateId) {
      const match = templates.find((t) => t.category === defaultCategory);
      if (match) {
        setTemplateId(match.id);
      }
    }
  }, [mode, defaultCategory, templates, templateId]);

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
  const successStepCount = 1;
  const questionCount = questions.length;
  const totalSteps = infoStepCount + questionCount + conclusionStepCount + successStepCount;

  const isInfoStep = mode === 'create' && stepIndex === 0;
  const isQuestionStep = stepIndex >= infoStepCount && stepIndex < infoStepCount + questionCount;
  const isConclusionStep = stepIndex === infoStepCount + questionCount;
  const isSuccessStep = stepIndex === totalSteps - 1;

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
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  /* ── Navigation handlers ── */
  const goNext = useCallback(async () => {
    if (isSuccessStep) {
      onClose();
      return;
    }

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
        setDirection(1);
        setStepIndex((i) => i + 1);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
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
      if (!projectId || !templateId) return;
      setCreating(true);
      try {
        const created = await createInspection({
          projectId,
          templateId,
          harnessName: harnessName.trim() || null,
          department: department.trim() || null,
          inspectorName: preset ? (profileName ?? null) : (inspectorName.trim() || null),
        });
        qc.invalidateQueries({ queryKey: inspectionKeys.lists() });
        const qs = await listQuestions(created.template_id);
        setCreatedInspection(created);
        setQuestions(filterQuestions(qs));
        setDirection(1);
        setStepIndex(1);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setCreating(false);
      }
      return;
    }

    setDirection(1);
    setStepIndex((i) => Math.min(totalSteps - 1, i + 1));
  }, [
    isSuccessStep, isConclusionStep, isQuestionStep, isInfoStep,
    effectiveInspection, conclusion, conclusionPhotos, currentQuestion, currentAnswer,
    projectId, templateId, harnessName, department, inspectorName,
    onClose, answerMutation, qc, totalSteps, preset, profileName,
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
    if (isSuccessStep) return true;
    if (isConclusionStep) return conclusion.isSafe !== null && (!preset?.requireConclusionText || conclusion.text.trim().length > 0);
    if (isInfoStep) return !!projectId && !!templateId;
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
  }, [isSuccessStep, isConclusionStep, isInfoStep, currentQuestion, answerMap, conclusion, projectId, templateId, preset]);

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

  /* ── Title ── */
  const title = useMemo(() => {
    if (isInfoStep) return preset?.title ?? 'ახალი აქტი';
    if (isSuccessStep) return 'დასრულებულია';
    if (isConclusionStep) return 'დასკვნა';
    return effectiveInspection?.harness_name || 'შემოწმების აქტი';
  }, [isInfoStep, isSuccessStep, isConclusionStep, effectiveInspection, preset]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={onClose}
            />
            <motion.div
              className="absolute inset-0 flex flex-col bg-white dark:bg-neutral-900"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Header */}
              <div className="shrink-0 border-b border-neutral-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/80">
                <div className="mx-auto flex max-w-2xl items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">{title}</h2>
                    {!isInfoStep && !isSuccessStep && (
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {stepIndex + 1} / {totalSteps}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    disabled={submitting || creating}
                    className="rounded-xl p-2.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 active:scale-95 dark:hover:bg-neutral-800"
                  >
                    <X size={20} />
                  </button>
                </div>
                {/* Progress bar */}
                {!isInfoStep && !isSuccessStep && (
                  <div className="mx-auto mt-3 max-w-2xl">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <motion.div
                        className="h-full rounded-full bg-brand-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-2xl px-6 py-8">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={stepIndex}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={springTransition}
                      className="space-y-6"
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
                          lockTemplate={!!preset}
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

                      {isHarnessGridStep && currentQuestion && (
                        <HarnessWizard
                          question={currentQuestion}
                          answer={currentAnswer}
                          onChange={handleAnswerChange}
                          onComplete={goNext}
                          completing={submitting || answerMutation.isPending}
                        />
                      )}

                      {isConclusionStep && (
                        <ConclusionStepRenderer
                          conclusion={conclusion}
                          onChange={setConclusion}
                          summary={gridSummary}
                          inspectionId={effectiveInspection!.id}
                          photos={conclusionPhotos}
                          onPhotoAdd={(path) => setConclusionPhotos((prev) => [...prev, path])}
                          onPhotoRemove={(path) => setConclusionPhotos((prev) => prev.filter((p) => p !== path))}
                        />
                      )}

                      {isSuccessStep && effectiveInspection && (
                        <InspectionSuccessCard
                          inspection={effectiveInspection}
                          printRoute={`#/inspections/${effectiveInspection.id}/print`}
                          projectName={(projects ?? []).find((p) => p.id === projectId)?.name}
                          projectId={projectId || undefined}
                          summaryBadges={
                            gridSummary
                              ? [
                                  ...(gridSummary.ok > 0 ? [{ label: `✓ ${gridSummary.ok} გამართული`, variant: 'ok' as const }] : []),
                                  ...(gridSummary.bad > 0 ? [{ label: `✗ ${gridSummary.bad} პრობლემა`, variant: 'bad' as const }] : []),
                                ]
                              : undefined
                          }
                          onClose={() => {
                            const detailRoute =
                              preset?.successDetailRoute && effectiveInspection
                                ? preset.successDetailRoute(effectiveInspection.id)
                                : null;
                            onClose();
                            if (detailRoute) navigate(detailRoute);
                          }}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer */}
              {!isSuccessStep && !isHarnessGridStep && (
                <div className="shrink-0 border-t border-neutral-200 bg-white px-6 py-4 dark:border-neutral-700 dark:bg-neutral-900">
                  <div className="mx-auto flex max-w-2xl items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goPrev}
                      disabled={stepIndex === 0 || submitting || creating}
                      className="gap-1.5"
                    >
                      <ArrowLeft size={16} />
                      წინა
                    </Button>
                    <Button
                      size="md"
                      className="min-w-[140px] gap-1.5"
                      onClick={goNext}
                      disabled={!canGoNext || submitting || creating}
                    >
                      {(submitting || creating) && <Loader2 size={15} className="animate-spin" />}
                      {isConclusionStep ? 'დასრულება' : 'შემდეგი'}
                      {!isConclusionStep && !(submitting || creating) && <ArrowRight size={16} />}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>,
    document.body
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
        <ProjectPicker
          label="პროექტი"
          required
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ value: p.id, label: p.name, logo: p.logo, company: p.company_name }))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProjectPicker
        label="პროექტი"
        required
        value={projectId}
        onChange={setProjectId}
        options={projects.map((p) => ({ value: p.id, label: p.name, logo: p.logo, company: p.company_name }))}
      />

      <Select
        label="შაბლონი"
        required
        value={templateId}
        onChange={setTemplateId}
        options={templates.map((t) => ({ value: t.id, label: t.name + (t.is_system ? ' (სისტემური)' : '') }))}
        placeholder="— აირჩიეთ შაბლონი —"
      />

      <TextInput
        label="დასახელება"
        value={harnessName}
        onChange={(e) => setHarnessName(e.target.value)}
        placeholder="მაგ: ხარაჩო A"
        radius="md"
      />

      <TextInput
        label="დეპარტამენტი"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        placeholder="დეპარტამენტის დასახელება"
        radius="md"
      />

      <TextInput
        label="ინსპექტორის სახელი"
        value={inspectorName}
        onChange={(e) => setInspectorName(e.target.value)}
        placeholder="სახელი გვარი"
        radius="md"
      />
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
              radius="md"
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
          autosize={false}
          radius="md"
        />
      )}

      {question.type === 'photo_upload' && (
        <PhotoUploadWidget paths={photoPaths} prefix="inspections" inspectionId={inspectionId} itemId={question.id} onAdd={onPhotoAdd} onRemove={onPhotoRemove} />
      )}

      {question.type === 'component_grid' && (
        <ComponentGridStep question={question} answer={answer} onChange={onChange} />
      )}

      <TextInput
        label="კომენტარი (არასავალდებულო)"
        value={answer?.comment ?? ''}
        onChange={(e) => onChange({ comment: e.target.value })}
        placeholder="დამატებითი შენიშვნა"
        radius="md"
      />
    </div>
  );
}

/* ─── Conclusion Step ─── */

function ConclusionStepRenderer({
  conclusion, onChange, inspectionId, photos, onPhotoAdd, onPhotoRemove, summary,
}: {
  conclusion: { isSafe: boolean | null; text: string };
  onChange: (c: { isSafe: boolean | null; text: string }) => void;
  inspectionId: string;
  photos: string[];
  onPhotoAdd: (path: string) => void;
  onPhotoRemove: (path: string) => void;
  summary: { total: number; ok: number; bad: number } | null;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">დასკვნა</h3>
        <p className="text-sm text-neutral-500">მიუთითეთ შემოწმების შედეგი და დასკვნა</p>
      </div>

      {summary && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            შემოწმების შეჯამება
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{summary.total} ერთეული</span>
            {summary.ok > 0 && (
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                ✓ {summary.ok} გამართული
              </span>
            )}
            {summary.bad > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-400">
                ✗ {summary.bad} პრობლემა
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">გამოყენების ვარგისება</p>
        <div className="grid grid-cols-2 gap-3">
          <AnswerButton selected={conclusion.isSafe === true} onClick={() => onChange({ ...conclusion, isSafe: true })} icon={<CheckCircle2 size={20} />} label="გამოყენებადია" variant="yes" />
          <AnswerButton selected={conclusion.isSafe === false} onClick={() => onChange({ ...conclusion, isSafe: false })} icon={<X size={20} />} label="არა ვარგისი" variant="no" />
        </div>
      </div>

      <Textarea
        label="დასკვნის ტექსტი"
        value={conclusion.text}
        onChange={(e) => onChange({ ...conclusion, text: e.target.value })}
        placeholder="შეიყვანეთ დასკვნა..."
        rows={5}
        autosize={false}
        radius="md"
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ფოტოები (არასავალდებულო)</p>
        <PhotoUploadWidget
          paths={photos}
          prefix="inspections"
          inspectionId={inspectionId}
          itemId="conclusion"
          onAdd={onPhotoAdd}
          onRemove={onPhotoRemove}
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
    ? selected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500 ring-offset-2' : 'bg-white text-neutral-600 hover:bg-emerald-50 hover:text-emerald-600 border border-neutral-200'
    : selected ? 'bg-red-500 text-white shadow-lg shadow-red-500/25 ring-2 ring-red-500 ring-offset-2' : 'bg-white text-neutral-600 hover:bg-red-50 hover:text-red-600 border border-neutral-200';
  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold transition-all ${base} dark:ring-offset-neutral-900`}>
      {icon}{label}
    </motion.button>
  );
}

/* ─── Component Grid Step ─── */

function ComponentGridStep({ question, answer, onChange }: {
  question: Question; answer?: Partial<Answer>; onChange: (patch: Partial<Answer>) => void;
}) {
  const rows = question.grid_rows ?? [];
  const cols = question.grid_cols ?? [];
  const statusCols = cols.filter((c) => c !== 'კომენტარი');
  const hasCommentCol = cols.includes('კომენტარი');
  const values: Record<string, Record<string, string>> = answer?.grid_values ?? {};

  function setCell(row: string, col: string, value: string) {
    const next = { ...values, [row]: { ...values[row], [col]: value } };
    onChange({ grid_values: next });
  }

  if (rows.length === 0 || cols.length === 0) {
    return <p className="text-sm text-neutral-500">ბადის მონაცემები ვერ მოიძებნა.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={row} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <p className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{row}</p>
            <div className="space-y-2">
              {statusCols.map((col) => (
                <div key={col} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-500">{col}</span>
                  <Select
                    size="sm"
                    value={values[row]?.[col] ?? ''}
                    onChange={(v) => setCell(row, col, v)}
                    options={[{ value: '', label: '—' }, { value: 'კი', label: 'კი' }, { value: 'არა', label: 'არა' }, { value: 'N/A', label: 'N/A' }]}
                  />
                </div>
              ))}
              {hasCommentCol && (
                <TextInput value={values[row]?.['კომენტარი'] ?? ''} onChange={(e) => setCell(row, 'კომენტარი', e.target.value)} placeholder="კომენტარი" size="xs" radius="md" mt="xs" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 md:block">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400">რიგი</th>
              {statusCols.map((col) => (<th key={col} className="px-4 py-2.5 text-center text-xs font-semibold text-neutral-600 dark:text-neutral-400">{col}</th>))}
              {hasCommentCol && <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400">კომენტარი</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {rows.map((row) => (
              <tr key={row} className="bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-200">{row}</td>
                {statusCols.map((col) => (
                  <td key={col} className="px-4 py-3 text-center">
                    <Select
                      size="sm"
                      value={values[row]?.[col] ?? ''}
                      onChange={(v) => setCell(row, col, v)}
                      options={[{ value: '', label: '—' }, { value: 'კი', label: 'კი' }, { value: 'არა', label: 'არა' }, { value: 'N/A', label: 'N/A' }]}
                    />
                  </td>
                ))}
                {hasCommentCol && (
                  <td className="px-4 py-3">
                    <TextInput value={values[row]?.['კომენტარი'] ?? ''} onChange={(e) => setCell(row, 'კომენტარი', e.target.value)} placeholder="კომენტარი" size="xs" radius="md" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
