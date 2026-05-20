import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { toast } from 'sonner';
import DeleteButton from '@/components/DeleteButton';
import FieldInput from '@/components/FieldInput';
import WizardSteps from '@/components/WizardSteps';
import HarnessWizard from '@/components/inspections/HarnessWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@mantine/core';
import {
  deleteInspection,
  getInspection,
  listAnswers,
  listQuestions,
  updateInspection,
  upsertAnswer,
  type Answer,
} from '@/lib/data/inspections';

const STEPS = [
  { label: 'ინფო' },
  { label: 'ქამრები' },
  { label: 'დასკვნა' },
];

export default function HarnessInspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [isSafe, setIsSafe] = useState<boolean | null>(null);
  const [conclusionText, setConclusionText] = useState('');
  const [isSafeInit, setIsSafeInit] = useState(false);

  const inspectionQ = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => getInspection(id!),
    enabled: !!id,
  });
  const inspection = inspectionQ.data ?? null;

  // Init conclusion state from loaded inspection once
  useEffect(() => {
    if (inspection && !isSafeInit) {
      setIsSafe(inspection.is_safe_for_use ?? null);
      setConclusionText(inspection.conclusion_text ?? '');
      setIsSafeInit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection?.id]);

  const questionsQ = useQuery({
    queryKey: ['questions', inspection?.template_id],
    queryFn: () => listQuestions(inspection!.template_id),
    enabled: !!inspection?.template_id,
  });
  const answersQ = useQuery({
    queryKey: ['answers', id],
    queryFn: () => listAnswers(id!),
    enabled: !!id,
  });

  const gridQuestion = (questionsQ.data ?? []).find((q) => q.type === 'component_grid') ?? null;
  const answers = answersQ.data ?? [];
  const gridAnswer: Partial<Answer> | undefined = gridQuestion
    ? answers.find((a) => a.question_id === gridQuestion.id)
    : undefined;

  const answerMutation = useMutation({
    mutationFn: upsertAnswer,
    onSuccess: (next) => {
      qc.setQueryData<Answer[]>(['answers', id], (prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((a) => a.question_id === next.question_id);
        if (idx === -1) return [...list, next];
        const copy = list.slice();
        copy[idx] = next;
        return copy;
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateInspection>[1]) => updateInspection(id!, patch),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['inspection', id] });
      qc.invalidateQueries({ queryKey: ['inspections'] });
      if (vars.status === 'completed') setJustCompleted(true);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInspection(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections'] });
      navigate('/inspections');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  if (inspectionQ.isLoading) return <SkeletonDetailPage />;
  if (!inspection) return <p className="text-sm text-neutral-500">აქტი ვერ მოიძებნა.</p>;

  const isDraft = inspection.status === 'draft' || inspection.status === 'in_progress';

  function handleGridChange(patch: Partial<Answer>) {
    if (!gridQuestion) return;
    answerMutation.mutate({
      inspectionId: inspection!.id,
      questionId: gridQuestion.id,
      gridValues: patch.grid_values ?? null,
    });
  }

  async function handleComplete() {
    if (isSafe === null) {
      toast.error('აირჩიეთ დასკვნა (უსაფრთხოა / არ არის)');
      return;
    }
    await updateMutation.mutateAsync({
      status: 'completed',
      is_safe_for_use: isSafe,
      conclusion_text: conclusionText.trim() || null,
    });
  }

  const safeChipBase = 'rounded-full border-2 px-5 py-2 text-sm font-semibold transition-all cursor-pointer select-none';

  return (
    <div className="space-y-6">
      {justCompleted && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-green-800">შემოწმების აქტი დასრულებულია ✓</p>
            <p className="text-sm text-green-700 mt-0.5">შეგიძლიათ PDF ვერსია გახსნათ ან სიაში დაბრუნდეთ.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => window.open(`#/inspections/${inspection.id}/print`, '_blank')}
              className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              PDF ნახვა
            </button>
            <Link to="/inspections" className="rounded-md border border-green-300 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100">
              სიაში დაბრუნება
            </Link>
          </div>
        </div>
      )}

      <header className="flex items-start justify-between gap-4">
        <div>
          <Link to="/inspections" className="text-sm text-brand-600 hover:underline">
            ← შემოწმების აქტები
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {inspection.harness_name || `ქამარი #${inspection.id.slice(0, 8)}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            სტატუსი: {inspection.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`#/inspections/${inspection.id}/print`, '_blank')}
          >
            <FileText size={14} className="mr-1" />
            PDF
          </Button>
          <DeleteButton onDelete={() => deleteMutation.mutate()} isPending={deleteMutation.isPending} />
        </div>
      </header>

      <WizardSteps steps={STEPS} current={step} onStep={setStep} />

      {/* ── Step 0: Info ── */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <FieldInput
              label="დასახელება"
              value={inspection.harness_name || null}
              disabled={!isDraft}
              onSave={(v) => updateMutation.mutate({ harness_name: v })}
            />
            <FieldInput
              label="ინსპექტორი"
              value={inspection.inspector_name || null}
              disabled={!isDraft}
              onSave={(v) => updateMutation.mutate({ inspector_name: v })}
            />
            <FieldInput
              label="დეპარტამენტი"
              value={inspection.department || null}
              disabled={!isDraft}
              onSave={(v) => updateMutation.mutate({ department: v })}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Harness grid ── */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6">
            {gridQuestion ? (
              <HarnessWizard
                question={gridQuestion}
                answer={gridAnswer}
                onChange={handleGridChange}
                onComplete={() => setStep(2)}
                completing={answerMutation.isPending}
              />
            ) : (
              <p className="text-sm text-neutral-500">კითხვა ვერ მოიძებნა.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Conclusion ── */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">დასკვნა</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">უსაფრთხოების სტატუსი</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={!isDraft}
                  onClick={() => setIsSafe(true)}
                  className={`${safeChipBase} ${
                    isSafe === true
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-emerald-400 dark:border-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  უსაფრთხოა
                </button>
                <button
                  type="button"
                  disabled={!isDraft}
                  onClick={() => setIsSafe(false)}
                  className={`${safeChipBase} ${
                    isSafe === false
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-red-400 dark:border-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  არ არის უსაფრთხო
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">შენიშვნა</p>
              <Textarea
                value={conclusionText}
                onChange={(e) => setConclusionText(e.target.value)}
                placeholder="დასკვნა / შენიშვნა..."
                rows={4}
                disabled={!isDraft}
                radius="md"
              />
            </div>

            {isDraft && (
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    updateMutation.mutate({
                      is_safe_for_use: isSafe,
                      conclusion_text: conclusionText.trim() || null,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  შენახვა
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={isSafe === null || updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'სრულდება...' : 'დასრულება'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
