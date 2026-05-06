import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  deleteInspection,
  getInspection,
  listAnswers,
  listInspectionPdfs,
  listQuestions,
  signedPdfUrl,
  updateInspection,
  upsertAnswer,
  type Answer,
  type Question,
} from '@/lib/data/inspections';

function answerFor(answers: Answer[], qid: string): Answer | undefined {
  return answers.find((a) => a.question_id === qid);
}

export default function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const inspectionQ = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => getInspection(id!),
    enabled: !!id,
  });
  const pdfsQ = useQuery({
    queryKey: ['inspectionPdfs', id],
    queryFn: () => listInspectionPdfs(id!),
    enabled: !!id,
  });
  const inspection = inspectionQ.data ?? null;
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

  const [actionError, setActionError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [conclusionDraft, setConclusionDraft] = useState<string | null>(null);
  const [safeDraft, setSafeDraft] = useState<boolean | null | undefined>(undefined);

  const pdfs = pdfsQ.data ?? [];
  const questions = questionsQ.data ?? [];
  const answers = answersQ.data ?? [];
  const isDraft = inspection?.status === 'draft';

  const queryError = inspectionQ.error ?? pdfsQ.error ?? questionsQ.error ?? answersQ.error;
  const error =
    actionError ??
    (queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null);

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
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      updateInspection(id!, {
        conclusion_text: conclusionDraft ?? inspection?.conclusion_text ?? null,
        is_safe_for_use: safeDraft === undefined ? inspection?.is_safe_for_use ?? null : safeDraft,
        status: 'completed',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection', id] });
      qc.invalidateQueries({ queryKey: ['inspections'] });
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  const conclusionMutation = useMutation({
    mutationFn: () =>
      updateInspection(id!, {
        conclusion_text: conclusionDraft,
        is_safe_for_use: safeDraft === undefined ? inspection?.is_safe_for_use ?? null : safeDraft,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection', id] });
      setConclusionDraft(null);
      setSafeDraft(undefined);
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInspection(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections'] });
      navigate('/inspections');
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  async function openPdf(path: string, key: string) {
    try {
      setOpening(key);
      const url = await signedPdfUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(null);
    }
  }

  if (inspectionQ.isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (!inspection) return <p className="text-sm text-neutral-500">აქტი ვერ მოიძებნა.</p>;

  // Group questions by section for nicer rendering
  const sections = [...new Set(questions.map((q) => q.section))].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link to="/inspections" className="text-sm text-brand-600 hover:underline">
            ← აქტები
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
            {inspection.harness_name || `აქტი #${inspection.id.slice(0, 8)}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {inspection.status}</p>
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
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-700">დარწმუნებული ხართ?</span>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'იშლება…' : 'წაშლა'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteMutation.isPending}
              >
                გაუქმება
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:border-red-300 hover:bg-red-50"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 size={14} className="mr-1" />
              წაშლა
            </Button>
          )}
        </div>
      </header>

      {/* Questions */}
      {questions.length > 0 && (
        <section className="space-y-4">
          {sections.map((sectionNum) => {
            const sectionQs = questions.filter((q) => q.section === sectionNum);
            return (
              <Card key={sectionNum}>
                <CardHeader>
                  <CardTitle className="text-base">სექცია {sectionNum}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-neutral-200">
                    {sectionQs.map((q) => (
                      <li key={q.id} className="py-3">
                        <QuestionRow
                          q={q}
                          ans={answerFor(answers, q.id)}
                          disabled={!isDraft || answerMutation.isPending}
                          onChange={(patch) =>
                            answerMutation.mutate({
                              inspectionId: id!,
                              questionId: q.id,
                              ...patch,
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {/* Conclusion + complete */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">დასკვნა</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isDraft ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="conc">დასკვნის ტექსტი</Label>
                <textarea
                  id="conc"
                  rows={3}
                  value={conclusionDraft ?? inspection.conclusion_text ?? ''}
                  onChange={(e) => setConclusionDraft(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1">
                <Label>გამოყენებისთვის უსაფრთხო?</Label>
                <div className="flex gap-2">
                  {[
                    { v: true, label: 'კი' },
                    { v: false, label: 'არა' },
                    { v: null, label: 'არ მოწმდება' },
                  ].map((opt) => {
                    const current = safeDraft === undefined ? inspection.is_safe_for_use : safeDraft;
                    const selected = current === opt.v;
                    return (
                      <button
                        key={String(opt.v)}
                        type="button"
                        onClick={() => setSafeDraft(opt.v)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          selected
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => conclusionMutation.mutate()}
                  disabled={
                    conclusionMutation.isPending ||
                    (conclusionDraft === null && safeDraft === undefined)
                  }
                >
                  {conclusionMutation.isPending ? 'ინახება…' : 'დასკვნის შენახვა'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                >
                  {completeMutation.isPending ? 'სრულდება…' : 'დასრულება'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-1 text-sm text-neutral-700">
              <div>{inspection.conclusion_text || '—'}</div>
              <div>
                გამოყენებისთვის უსაფრთხო:{' '}
                {inspection.is_safe_for_use === null
                  ? '—'
                  : inspection.is_safe_for_use
                    ? 'კი'
                    : 'არა'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">PDF რეპორტები</h2>
        {pdfs.length === 0 ? (
          <p className="text-sm text-neutral-500">PDF ჯერ არ არის დამატებული.</p>
        ) : (
          <ul className="space-y-2">
            {pdfs.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3"
              >
                <span className="text-sm text-neutral-700">
                  {new Date(p.generated_at).toLocaleString('ka-GE')}
                </span>
                <Button
                  type="button"
                  onClick={() => void openPdf(p.pdf_url, p.id)}
                  disabled={opening === p.id}
                >
                  {opening === p.id ? 'იხსნება…' : 'PDF-ის ნახვა'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuestionRow({
  q,
  ans,
  disabled,
  onChange,
}: {
  q: Question;
  ans: Answer | undefined;
  disabled: boolean;
  onChange: (patch: {
    valueBool?: boolean | null;
    valueNum?: number | null;
    valueText?: string | null;
    comment?: string | null;
  }) => void;
}) {
  const [comment, setComment] = useState(ans?.comment ?? '');

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-neutral-900">{q.title}</div>

      {q.type === 'yesno' && (
        <div className="flex gap-2">
          {[
            { v: true, label: 'კი' },
            { v: false, label: 'არა' },
            { v: null, label: 'არ ეხება' },
          ].map((opt) => {
            const selected = (ans?.value_bool ?? null) === opt.v;
            return (
              <button
                key={String(opt.v)}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ valueBool: opt.v, comment })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  selected
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'measure' && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            disabled={disabled}
            defaultValue={ans?.value_num ?? ''}
            onBlur={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value);
              onChange({ valueNum: v, comment });
            }}
            className="max-w-[160px]"
            placeholder={
              q.min_val != null && q.max_val != null
                ? `${q.min_val}–${q.max_val}${q.unit ? ` ${q.unit}` : ''}`
                : q.unit ?? ''
            }
          />
          {q.unit && <span className="text-xs text-neutral-500">{q.unit}</span>}
        </div>
      )}

      {q.type === 'freetext' && (
        <textarea
          rows={2}
          disabled={disabled}
          defaultValue={ans?.value_text ?? ''}
          onBlur={(e) => onChange({ valueText: e.target.value, comment })}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-neutral-50"
        />
      )}

      {(q.type === 'photo_upload' || q.type === 'component_grid') && (
        <p className="text-xs italic text-neutral-500">
          ამ ტიპის კითხვა ფასდება მობილურ აპში.
        </p>
      )}

      <Input
        disabled={disabled}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onBlur={() => {
          if ((ans?.comment ?? '') !== comment) {
            onChange({
              valueBool: ans?.value_bool ?? null,
              valueNum: ans?.value_num ?? null,
              valueText: ans?.value_text ?? null,
              comment: comment || null,
            });
          }
        }}
        placeholder="კომენტარი (არასავალდებულო)"
        className="text-xs"
      />
    </div>
  );
}
