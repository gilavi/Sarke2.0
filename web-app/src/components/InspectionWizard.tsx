import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, FileText, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
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

/* ─── Types ─── */

type WizardMode = 'create' | 'edit';

interface InspectionWizardProps {
  open: boolean;
  onClose: () => void;
  // Creation mode
  defaultProjectId?: string;
  defaultCategory?: string;
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

/* ─── Component ─── */

export default function InspectionWizard({
  open,
  onClose,
  defaultProjectId = '',
  defaultCategory = '',
  inspection: existingInspection,
  initialQuestions = [],
  initialAnswers = [],
  onComplete,
}: InspectionWizardProps) {
  const qc = useQueryClient();
  const mode: WizardMode = existingInspection ? 'edit' : 'create';

  /* ── Info form state (creation only) ── */
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [templateId, setTemplateId] = useState('');
  const [harnessName, setHarnessName] = useState('');
  const [department, setDepartment] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [creating, setCreating] = useState(false);

  /* ── Created inspection (after step 0) ── */
  const [createdInspection, setCreatedInspection] = useState<Inspection | null>(existingInspection ?? null);

  /* ── Questions & answers ── */
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
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

  /* ── Data queries ── */
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects, enabled: open && mode === 'create' });
  const { data: templates } = useQuery({ queryKey: ['templates'], queryFn: listTemplates, enabled: open && mode === 'create' });

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
      setTemplateId('');
      setHarnessName('');
      setDepartment('');
      setInspectorName('');
      setCreatedInspection(existingInspection ?? null);
      setQuestions(initialQuestions);
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
    }
    if (!open) {
      hasResetRef.current = false;
    }
  }, [open, existingInspection, initialQuestions, initialAnswers, defaultProjectId]);

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
        });
        qc.invalidateQueries({ queryKey: ['inspection', insId] });
        qc.invalidateQueries({ queryKey: ['inspections'] });
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
          inspectorName: inspectorName.trim() || null,
        });
        qc.invalidateQueries({ queryKey: ['inspections'] });
        const qs = await listQuestions(created.template_id);
        setCreatedInspection(created);
        setQuestions(qs);
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
    effectiveInspection, conclusion, currentQuestion, currentAnswer,
    projectId, templateId, harnessName, department, inspectorName,
    onClose, answerMutation, qc, totalSteps,
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
    if (isConclusionStep) return conclusion.isSafe !== null;
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
  }, [isSuccessStep, isConclusionStep, isInfoStep, currentQuestion, answerMap, conclusion, projectId, templateId]);

  /* ── Photo handling ── */
  const photosQ = useQuery({
    queryKey: ['answerPhotos', currentAnswer?.id],
    queryFn: () => listAnswerPhotos(currentAnswer!.id!),
    enabled: currentQuestion?.type === 'photo_upload' && !!currentAnswer?.id,
  });

  const photoPaths = photosQ.data?.map((p) => p.storage_path) ?? [];

  const handlePhotoAdd = useCallback(async (path: string) => {
    if (!currentAnswer?.id) return;
    await addAnswerPhoto(currentAnswer.id, path, null);
    qc.invalidateQueries({ queryKey: ['answerPhotos', currentAnswer.id] });
  }, [currentAnswer, qc]);

  const handlePhotoRemove = useCallback(async (path: string) => {
    if (!currentAnswer?.id) return;
    await removeAnswerPhoto(currentAnswer.id, path);
    qc.invalidateQueries({ queryKey: ['answerPhotos', currentAnswer.id] });
  }, [currentAnswer, qc]);

  useEffect(() => {
    if (currentQuestion?.type === 'photo_upload' && !currentAnswer?.id && !answerMutation.isPending) {
      answerMutation.mutate({ inspectionId: effectiveInspection!.id, questionId: currentQuestion.id });
    }
  }, [currentQuestion, currentAnswer, answerMutation, effectiveInspection]);

  /* ── Title ── */
  const title = useMemo(() => {
    if (isInfoStep) return 'ახალი აქტი';
    if (isSuccessStep) return 'დასრულებულია';
    if (isConclusionStep) return 'დასკვნა';
    return effectiveInspection?.harness_name || 'შემოწმების აქტი';
  }, [isInfoStep, isSuccessStep, isConclusionStep, effectiveInspection]);

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
                          projects={projects ?? []}
                          templates={templates ?? []}
                        />
                      )}

                      {isQuestionStep && currentQuestion && (
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

                      {isConclusionStep && (
                        <ConclusionStepRenderer
                          conclusion={conclusion}
                          onChange={setConclusion}
                        />
                      )}

                      {isSuccessStep && effectiveInspection && (
                        <SuccessStep
                          inspection={effectiveInspection}
                          onClose={onClose}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer */}
              {!isSuccessStep && (
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
}: {
  projectId: string; setProjectId: (v: string) => void;
  templateId: string; setTemplateId: (v: string) => void;
  harnessName: string; setHarnessName: (v: string) => void;
  department: string; setDepartment: (v: string) => void;
  inspectorName: string; setInspectorName: (v: string) => void;
  projects: { id: string; name: string }[];
  templates: { id: string; name: string; is_system?: boolean }[];
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">პროექტი <span className="text-red-500">*</span></Label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          required
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <option value="">— აირჩიეთ პროექტი —</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">შაბლონი <span className="text-red-500">*</span></Label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          required
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <option value="">— აირჩიეთ შაბლონი —</option>
          {templates.map((t) => (<option key={t.id} value={t.id}>{t.name} {t.is_system ? '(სისტემური)' : ''}</option>))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">დასახელება</Label>
        <Input value={harnessName} onChange={(e) => setHarnessName(e.target.value)} placeholder="მაგ: ხარაჩო A" className="rounded-xl" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">დეპარტამენტი</Label>
        <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="დეპარტამენტის დასახელება" className="rounded-xl" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">ინსპექტორის სახელი</Label>
        <Input value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} placeholder="სახელი გვარი" className="rounded-xl" />
      </div>
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
            <Input type="number" value={answer?.value_num ?? ''} onChange={(e) => onChange({ value_num: e.target.value ? Number(e.target.value) : null })} placeholder="მნიშვნელობა" className="rounded-xl" />
            {question.unit && <span className="shrink-0 text-sm text-neutral-500">{question.unit}</span>}
          </div>
          {question.min_val !== null && question.max_val !== null && (
            <p className="text-xs text-neutral-400">დასაშვები: {question.min_val} – {question.max_val} {question.unit || ''}</p>
          )}
        </div>
      )}

      {question.type === 'freetext' && (
        <textarea value={answer?.value_text ?? ''} onChange={(e) => onChange({ value_text: e.target.value })} placeholder="შეიყვანეთ პასუხი..." rows={4}
          className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100" />
      )}

      {question.type === 'photo_upload' && (
        <PhotoUploadWidget paths={photoPaths} prefix="inspections" inspectionId={inspectionId} itemId={question.id} onAdd={onPhotoAdd} onRemove={onPhotoRemove} />
      )}

      {question.type === 'component_grid' && (
        <ComponentGridStep question={question} answer={answer} onChange={onChange} />
      )}

      <div className="space-y-1.5">
        <Label className="text-sm text-neutral-600">კომენტარი (არასავალდებულო)</Label>
        <Input value={answer?.comment ?? ''} onChange={(e) => onChange({ comment: e.target.value })} placeholder="დამატებითი შენიშვნა" className="rounded-xl" />
      </div>
    </div>
  );
}

/* ─── Conclusion Step ─── */

function ConclusionStepRenderer({
  conclusion, onChange,
}: {
  conclusion: { isSafe: boolean | null; text: string };
  onChange: (c: { isSafe: boolean | null; text: string }) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">დასკვნა</h3>
        <p className="text-sm text-neutral-500">მიუთითეთ შემოწმების შედეგი და დასკვნა</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">გამოყენების ვარგისება</Label>
        <div className="grid grid-cols-2 gap-3">
          <AnswerButton selected={conclusion.isSafe === true} onClick={() => onChange({ ...conclusion, isSafe: true })} icon={<CheckCircle2 size={20} />} label="გამოყენებადია" variant="yes" />
          <AnswerButton selected={conclusion.isSafe === false} onClick={() => onChange({ ...conclusion, isSafe: false })} icon={<X size={20} />} label="არა ვარგისი" variant="no" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">დასკვნის ტექსტი</Label>
        <textarea value={conclusion.text} onChange={(e) => onChange({ ...conclusion, text: e.target.value })} placeholder="შეიყვანეთ დასკვნა..." rows={5}
          className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100" />
      </div>
    </div>
  );
}

/* ─── Success Step ─── */

function SuccessStep({ inspection, onClose }: { inspection: Inspection; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
      >
        <CheckCircle2 size={40} />
      </motion.div>
      <h3 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">აქტი დასრულებულია</h3>
      <p className="mb-8 max-w-sm text-sm text-neutral-500">შემოწმების აქტი წარმატებით დასრულდა. შეგიძლიათ PDF ვერსია გახსნათ ან ახალი აქტი შექმნათ.</p>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => {
            onClose();
            navigate('/inspections');
          }}
        >
          სიაში დაბრუნება
        </Button>
        <Button
          onClick={() => window.open(`#/inspections/${inspection.id}/print`, '_blank')}
          className="gap-1.5"
        >
          <FileText size={16} />
          PDF ნახვა
        </Button>
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
                  <select value={values[row]?.[col] ?? ''} onChange={(e) => setCell(row, col, e.target.value)}
                    className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-800">
                    <option value="">—</option><option value="კი">კი</option><option value="არა">არა</option><option value="N/A">N/A</option>
                  </select>
                </div>
              ))}
              {hasCommentCol && (
                <Input value={values[row]?.['კომენტარი'] ?? ''} onChange={(e) => setCell(row, 'კომენტარი', e.target.value)} placeholder="კომენტარი" className="mt-2 rounded-lg text-xs" />
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
                    <select value={values[row]?.[col] ?? ''} onChange={(e) => setCell(row, col, e.target.value)}
                      className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800">
                      <option value="">—</option><option value="კი">კი</option><option value="არა">არა</option><option value="N/A">N/A</option>
                    </select>
                  </td>
                ))}
                {hasCommentCol && (
                  <td className="px-4 py-3">
                    <Input value={values[row]?.['კომენტარი'] ?? ''} onChange={(e) => setCell(row, 'კომენტარი', e.target.value)} placeholder="კომენტარი" className="rounded-lg text-xs" />
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
