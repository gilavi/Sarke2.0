import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@mantine/core';
import { toast } from 'sonner';
import HarnessWizard from '@/components/inspections/HarnessWizard';
import { listProjects, type Project } from '@/lib/data/projects';
import {
  createInspection,
  listAnswers,
  listQuestions,
  updateInspection,
  upsertAnswer,
  type Answer,
  type Inspection,
} from '@/lib/data/inspections';
import { useAuth } from '@/lib/auth';

const HARNESS_TEMPLATE_ID = '22222222-2222-2222-2222-222222222222';

const STEP_LABELS = ['პროექტი', 'ქამრები', 'დასკვნა'];
const STEP_TITLES = ['პროექტის არჩევა', 'ქამრების შემოწმება', 'დასკვნა'];

const STEP_PROJECT    = 0;
const STEP_HARNESS    = 1;
const STEP_CONCLUSION = 2;
const STEP_SUCCESS    = 3;

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const panelVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, damping: 28, stiffness: 300 } },
  exit:   { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

interface Props {
  open: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export default function HarnessInspectionModal({ open, onClose, defaultProjectId = '' }: Props) {
  const qc = useQueryClient();
  const { profile } = useAuth();

  const [step, setStep] = useState(defaultProjectId ? STEP_HARNESS : STEP_PROJECT);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [gridAnswer, setGridAnswer] = useState<Partial<Answer> | undefined>(undefined);
  const [isSafe, setIsSafe] = useState<boolean | null>(null);
  const [conclusionText, setConclusionText] = useState('');
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState(false);

  const inspectorName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null;

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
    enabled: open,
  });

  const questionsQ = useQuery({
    queryKey: ['questions', HARNESS_TEMPLATE_ID],
    queryFn: () => listQuestions(HARNESS_TEMPLATE_ID),
    enabled: open,
  });
  const gridQuestion = (questionsQ.data ?? []).find((q) => q.type === 'component_grid') ?? null;

  // Load existing answers if reopening a draft
  const existingAnswersQ = useQuery({
    queryKey: ['answers', inspection?.id],
    queryFn: () => listAnswers(inspection!.id),
    enabled: !!inspection?.id,
  });
  useEffect(() => {
    if (existingAnswersQ.data && gridQuestion && !gridAnswer) {
      const ga = existingAnswersQ.data.find((a: Answer) => a.question_id === gridQuestion.id);
      if (ga) setGridAnswer(ga);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAnswersQ.data, gridQuestion?.id]);

  const answerMutation = useMutation({
    mutationFn: upsertAnswer,
    onSuccess: (next) => setGridAnswer(next),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  function handleClose() {
    // Reset state on close
    setStep(defaultProjectId ? STEP_HARNESS : STEP_PROJECT);
    setProjectId(defaultProjectId);
    setInspection(null);
    setGridAnswer(undefined);
    setIsSafe(null);
    setConclusionText('');
    setCreating(false);
    setCompleting(false);
    onClose();
  }

  async function handleProjectSelect(pid: string) {
    setProjectId(pid);
    setCreating(true);
    try {
      const created = await createInspection({
        projectId: pid,
        templateId: HARNESS_TEMPLATE_ID,
        inspectorName,
      });
      qc.invalidateQueries({ queryKey: ['inspections'] });
      setInspection(created);
      setStep(STEP_HARNESS);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  function handleGridChange(patch: Partial<Answer>) {
    setGridAnswer((prev) => ({ ...(prev ?? {}), ...patch }));
    if (!inspection || !gridQuestion) return;
    answerMutation.mutate({
      inspectionId: inspection.id,
      questionId: gridQuestion.id,
      gridValues: patch.grid_values ?? null,
    });
  }

  async function handleComplete() {
    if (!inspection || isSafe === null) {
      toast.error('აირჩიეთ დასკვნა');
      return;
    }
    setCompleting(true);
    try {
      await updateInspection(inspection.id, {
        status: 'completed',
        is_safe_for_use: isSafe,
        conclusion_text: conclusionText.trim() || null,
      });
      qc.invalidateQueries({ queryKey: ['inspections'] });
      qc.invalidateQueries({ queryKey: ['inspection', inspection.id] });
      setStep(STEP_SUCCESS);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setCompleting(false);
    }
  }

  const totalSteps = 3; // project, harness, conclusion (success not counted)
  const progressStep = Math.min(step, totalSteps);
  const progressPercent = (progressStep / totalSteps) * 100;
  const showProgress = step > STEP_PROJECT && step < STEP_SUCCESS;
  const title = step === STEP_SUCCESS ? 'დასრულებულია' : STEP_TITLES[step] ?? 'შემოწმება';

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
                    <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {title}
                    </h2>
                    {showProgress && (
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {STEP_LABELS[step]}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={creating || completing}
                    className="rounded-xl p-2.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 active:scale-95 dark:hover:bg-neutral-800"
                  >
                    <X size={20} />
                  </button>
                </div>
                {showProgress && (
                  <div className="mx-auto mt-3 max-w-2xl">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <motion.div
                        className="h-full rounded-full bg-brand-500"
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className={`mx-auto px-6 py-8 ${step === STEP_PROJECT ? 'max-w-3xl' : 'max-w-2xl'}`}>

                  {/* Step 0: Project picker */}
                  {step === STEP_PROJECT && (
                    <div className="space-y-4">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        დამცავი ქამრების შემოწმება — აირჩიეთ პროექტი
                      </p>
                      {creating ? (
                        <div className="flex items-center justify-center py-20 text-sm text-neutral-500">
                          იქმნება...
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {projects.map((p) => (
                            <ProjectCard
                              key={p.id}
                              project={p}
                              selected={projectId === p.id}
                              onSelect={() => handleProjectSelect(p.id)}
                            />
                          ))}
                          {projects.length === 0 && (
                            <p className="text-sm text-neutral-500">პროექტები ვერ მოიძებნა.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 1: Harness grid */}
                  {step === STEP_HARNESS && gridQuestion && (
                    <HarnessWizard
                      question={gridQuestion}
                      answer={gridAnswer}
                      onChange={handleGridChange}
                      onComplete={() => setStep(STEP_CONCLUSION)}
                      completing={answerMutation.isPending}
                    />
                  )}

                  {/* Step 2: Conclusion */}
                  {step === STEP_CONCLUSION && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          უსაფრთხოების სტატუსი
                        </p>
                        <div className="flex gap-3">
                          {([
                            { value: true,  label: 'უსაფრთხოა',        active: 'border-emerald-500 bg-emerald-500 text-white', hover: 'hover:border-emerald-400' },
                            { value: false, label: 'არ არის უსაფრთხო', active: 'border-red-500 bg-red-500 text-white',         hover: 'hover:border-red-400' },
                          ] as const).map((opt) => (
                            <button
                              key={String(opt.value)}
                              type="button"
                              onClick={() => setIsSafe(opt.value)}
                              className={[
                                'rounded-full border-2 px-6 py-2.5 text-sm font-semibold transition-all',
                                isSafe === opt.value
                                  ? opt.active
                                  : `border-neutral-200 text-neutral-600 ${opt.hover} dark:border-neutral-600 dark:text-neutral-300`,
                              ].join(' ')}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">შენიშვნა</p>
                        <Textarea
                          value={conclusionText}
                          onChange={(e) => setConclusionText(e.target.value)}
                          placeholder="დასკვნა / შენიშვნა..."
                          rows={4}
                          radius="md"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 3: Success */}
                  {step === STEP_SUCCESS && (
                    <div className="flex flex-col items-center gap-6 py-12 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                        <CheckCircle2 size={40} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                          შემოწმება დასრულდა
                        </p>
                        <p className="mt-1 text-sm text-neutral-500">
                          {isSafe ? 'სტატუსი: უსაფრთხოა ✓' : 'სტატუსი: არ არის უსაფრთხო'}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        {inspection && (
                          <button
                            onClick={() => window.open(`#/inspections/${inspection.id}/print`, '_blank')}
                            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                          >
                            PDF ნახვა
                          </button>
                        )}
                        <button
                          onClick={handleClose}
                          className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
                        >
                          დახურვა
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer — only on conclusion step */}
              {step === STEP_CONCLUSION && (
                <div className="shrink-0 border-t border-neutral-200 bg-white px-6 py-4 dark:border-neutral-700 dark:bg-neutral-900">
                  <div className="mx-auto flex max-w-2xl items-center justify-between">
                    <button
                      onClick={() => setStep(STEP_HARNESS)}
                      className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      ← წინა
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={isSafe === null || completing}
                      className="min-w-[140px] rounded-2xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 active:scale-95 disabled:opacity-40"
                    >
                      {completing ? 'სრულდება...' : 'დასრულება'}
                    </button>
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

/* ── Project Card ── */

function ProjectCard({
  project,
  selected,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  onSelect: () => void;
}) {
  const initials = project.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all',
        selected
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
          : 'border-neutral-200 bg-white hover:border-brand-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-brand-600',
      ].join(' ')}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-brand-50 dark:border-neutral-700 dark:bg-brand-950/20">
        {project.logo ? (
          <img src={project.logo} alt={project.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-base font-bold text-brand-600 dark:text-brand-400">{initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{project.name}</p>
        {project.company_name && (
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{project.company_name}</p>
        )}
        {project.address && (
          <p className="mt-1 truncate text-xs text-neutral-400 dark:text-neutral-500">{project.address}</p>
        )}
      </div>
      <div
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-brand-500 bg-brand-500' : 'border-neutral-300 dark:border-neutral-600',
        ].join(' ')}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}
