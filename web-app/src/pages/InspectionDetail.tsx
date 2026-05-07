import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { usePendingCreate } from '@/lib/usePendingCreate';
import DeleteButton from '@/components/DeleteButton';
import SignatureCanvas from '@/components/SignatureCanvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addAnswerPhoto,
  createInspection,
  deleteInspection,
  getInspection,
  listAnswerPhotos,
  listAnswers,
  listInspectionPdfs,
  listQuestions,
  removeAnswerPhoto,
  signedPdfUrl,
  updateInspection,
  upsertAnswer,
  type Answer,
  type AnswerPhoto,
  type Inspection,
  type Question,
} from '@/lib/data/inspections';

type PendingInspection = Parameters<typeof createInspection>[0];
// photoUpload imported dynamically inside QuestionRow to keep top-level bundle lean

function answerFor(answers: Answer[], qid: string): Answer | undefined {
  return answers.find((a) => a.question_id === qid);
}

export default function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { pendingCreate, lazyCreate } = usePendingCreate<PendingInspection>();
  const isPending = id === 'draft';

  const inspectionQ = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => getInspection(id!),
    enabled: !!id && !isPending,
  });
  const pdfsQ = useQuery({
    queryKey: ['inspectionPdfs', id],
    queryFn: () => listInspectionPdfs(id!),
    enabled: !!id && !isPending,
  });
  const inspection: Inspection | null = inspectionQ.data ?? (isPending && pendingCreate ? {
    id: 'draft',
    project_id: pendingCreate.projectId,
    user_id: '',
    template_id: pendingCreate.templateId,
    status: 'draft',
    harness_name: pendingCreate.harnessName ?? null,
    department: pendingCreate.department ?? null,
    inspector_name: pendingCreate.inspectorName ?? null,
    conclusion_text: null,
    is_safe_for_use: null,
    inspector_signature: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  } : null);
  const templateId = isPending ? pendingCreate?.templateId : inspection?.template_id;
  const questionsQ = useQuery({
    queryKey: ['questions', templateId],
    queryFn: () => listQuestions(templateId!),
    enabled: !!templateId,
  });
  const answersQ = useQuery({
    queryKey: ['answers', id],
    queryFn: () => listAnswers(id!),
    enabled: !!id && !isPending,
  });

  const [opening, setOpening] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [conclusionDraft, setConclusionDraft] = useState<string | null>(null);
  const [safeDraft, setSafeDraft] = useState<boolean | null | undefined>(undefined);
  const [signingOpen, setSigningOpen] = useState(false);

  const pdfs = pdfsQ.data ?? [];
  const questions = questionsQ.data ?? [];
  const answers = answersQ.data ?? [];
  const isDraft = inspection?.status === 'draft';

  const queryError = inspectionQ.error ?? pdfsQ.error ?? questionsQ.error ?? answersQ.error;
  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

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
      setJustCompleted(true);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
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

  async function openPdf(path: string, key: string) {
    try {
      setOpening(key);
      const url = await signedPdfUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(null);
    }
  }

  async function handleAnswer(patch: {
    questionId: string;
    valueBool?: boolean | null;
    valueNum?: number | null;
    valueText?: string | null;
    comment?: string | null;
  }) {
    let realId = isPending ? null : id!;
    if (isPending) {
      try {
        realId = await lazyCreate(createInspection);
        if (!realId) return;
        qc.invalidateQueries({ queryKey: ['inspections'] });
        navigate(`/inspections/${realId}`, { replace: true, state: {} });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
        return;
      }
    }
    answerMutation.mutate({ inspectionId: realId!, ...patch });
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
            ← აქტები
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
            {inspection.harness_name || `აქტი #${inspection.id.slice(0, 8)}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {inspection.status === 'completed' ? 'დასრულებული' : 'დრაფტი'}</p>
        </div>
        {!isPending && (
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
        )}
      </header>

      {/* Inspector info */}
      <Card>
        <CardHeader><CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>დეპარტამენტი</Label>
            {isDraft ? (
              <input
                key={inspection.department ?? ''}
                defaultValue={inspection.department ?? ''}
                onBlur={(e) => {
                  if (isPending) return;
                  const v = e.target.value.trim() || null;
                  if (v !== inspection.department)
                    updateInspection(id!, { department: v }).then(() =>
                      qc.invalidateQueries({ queryKey: ['inspection', id] })
                    );
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="დეპარტამენტის დასახელება"
              />
            ) : (
              <p className="text-sm text-neutral-700">{inspection.department || '—'}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>ინსპექტორის სახელი</Label>
            {isDraft ? (
              <input
                key={inspection.inspector_name ?? ''}
                defaultValue={inspection.inspector_name ?? ''}
                onBlur={(e) => {
                  if (isPending) return;
                  const v = e.target.value.trim() || null;
                  if (v !== inspection.inspector_name)
                    updateInspection(id!, { inspector_name: v }).then(() =>
                      qc.invalidateQueries({ queryKey: ['inspection', id] })
                    );
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="სახელი გვარი"
              />
            ) : (
              <p className="text-sm text-neutral-700">{inspection.inspector_name || '—'}</p>
            )}
          </div>
        </CardContent>
      </Card>

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
                          pendingMode={isPending}
                          inspectionId={id!}
                          onChange={(patch) =>
                            void handleAnswer({ questionId: q.id, ...patch })
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
              <div className="space-y-1">
                <Label>ინსპექტორის ხელმოწერა</Label>
                {inspection.inspector_signature ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={`data:image/png;base64,${inspection.inspector_signature}`}
                      alt="ხელმოწერა"
                      className="h-16 rounded border border-neutral-200 bg-white p-1"
                    />
                    <button
                      className="text-xs text-neutral-500 hover:text-red-600"
                      onClick={() => { if (!isPending) updateInspection(id!, { inspector_signature: null }).then(() => qc.invalidateQueries({ queryKey: ['inspection', id] })); }}
                    >
                      წაშლა
                    </button>
                  </div>
                ) : signingOpen ? (
                  <SignatureCanvas
                    onCancel={() => setSigningOpen(false)}
                    onSave={(dataUrl) => {
                      if (isPending) { setSigningOpen(false); return; }
                      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
                      updateInspection(id!, { inspector_signature: base64 }).then(() => {
                        qc.invalidateQueries({ queryKey: ['inspection', id] });
                        setSigningOpen(false);
                      });
                    }}
                  />
                ) : (
                  <button
                    className="rounded-md border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600"
                    onClick={() => setSigningOpen(true)}
                  >
                    + ხელმოწერის დამატება
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => conclusionMutation.mutate()}
                  disabled={
                    isPending ||
                    conclusionMutation.isPending ||
                    (conclusionDraft === null && safeDraft === undefined)
                  }
                >
                  {conclusionMutation.isPending ? 'ინახება…' : 'დასკვნის შენახვა'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => completeMutation.mutate()}
                  disabled={isPending || completeMutation.isPending}
                >
                  {completeMutation.isPending ? 'სრულდება…' : 'დასრულება'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-sm text-neutral-700">
              <div>{inspection.conclusion_text || '—'}</div>
              <div>
                გამოყენებისთვის უსაფრთხო:{' '}
                {inspection.is_safe_for_use === null
                  ? '—'
                  : inspection.is_safe_for_use
                    ? 'კი'
                    : 'არა'}
              </div>
              {inspection.inspector_signature && (
                <div>
                  <p className="text-xs text-neutral-500 mb-1">ინსპექტორის ხელმოწერა</p>
                  <img
                    src={`data:image/png;base64,${inspection.inspector_signature}`}
                    alt="ხელმოწერა"
                    className="h-16 rounded border border-neutral-200 bg-white p-1"
                  />
                </div>
              )}
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
  pendingMode,
  inspectionId,
  onChange,
}: {
  q: Question;
  ans: Answer | undefined;
  disabled: boolean;
  pendingMode: boolean;
  inspectionId: string;
  onChange: (patch: {
    valueBool?: boolean | null;
    valueNum?: number | null;
    valueText?: string | null;
    comment?: string | null;
  }) => void;
}) {
  const [comment, setComment] = useState(ans?.comment ?? '');
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // Photos — only loaded for photo_upload questions where an answer exists
  const photosQ = useQuery<AnswerPhoto[]>({
    queryKey: ['answerPhotos', ans?.id],
    queryFn: () => listAnswerPhotos(ans!.id),
    enabled: !!ans?.id && q.type === 'photo_upload',
    staleTime: 0,
  });
  const photos = photosQ.data ?? [];

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSignedUrls, setPhotoSignedUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Resolve signed URLs
  const photoIds = photos.map((p) => p.id).join(',');
  useEffect(() => {
    if (!photoIds) return;
    const missing = photos.filter((p) => !photoSignedUrls[p.id]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (p) => {
        try {
          const { signedInspectionPhotoUrl } = await import('@/lib/photoUpload');
          const url = await signedInspectionPhotoUrl(p.storage_path);
          return [p.id, url] as const;
        } catch {
          return [p.id, ''] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setPhotoSignedUrls((prev) => {
        const next = { ...prev };
        for (const [id, url] of pairs) next[id] = url;
        return next;
      });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoIds]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightbox === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => i !== null ? Math.min(i + 1, photos.length - 1) : null);
      if (e.key === 'ArrowLeft') setLightbox((i) => i !== null ? Math.max(i - 1, 0) : null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, photos.length]);

  async function handlePhotoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const { uploadInspectionPhoto: upload } = await import('@/lib/photoUpload');
      // Ensure an answer row exists first
      let answerId = ans?.id;
      if (!answerId) {
        const saved = await import('@/lib/data/inspections').then((m) =>
          m.upsertAnswer({ inspectionId, questionId: q.id }),
        );
        answerId = saved.id;
        qc.invalidateQueries({ queryKey: ['answers', inspectionId] });
      }
      // Best-effort geolocation — don't block upload if denied/unavailable
      const geo = await new Promise<{ latitude?: number; longitude?: number; address?: string } | null>((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 },
        );
      });
      for (const file of Array.from(files)) {
        const path = await upload('inspections', inspectionId, q.id, file);
        await addAnswerPhoto(answerId, path, null, geo ?? undefined);
      }
      qc.invalidateQueries({ queryKey: ['answerPhotos', answerId] });
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : String(e));
    } finally {
      setPhotoUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handlePhotoRemove(photo: AnswerPhoto) {
    try {
      await removeAnswerPhoto(photo.id, photo.storage_path);
    } catch {
      // best-effort
    }
    qc.invalidateQueries({ queryKey: ['answerPhotos', ans?.id] });
  }

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

      {q.type === 'photo_upload' && (
        <div>
          {/* Thumbnail strip */}
          {photos.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setLightbox(i)}
                    className="h-16 w-16 overflow-hidden rounded-md border border-neutral-200"
                  >
                    {photoSignedUrls[p.id] ? (
                      <img src={photoSignedUrls[p.id]} alt={`ფოტო ${i + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-neutral-100" />
                    )}
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handlePhotoRemove(p)}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!disabled && !pendingMode && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={photoUploading}
                className="flex items-center gap-1 rounded-md border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
              >
                <Camera size={12} />
                {photoUploading ? 'იტვირთება…' : 'ფოტოს დამატება'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handlePhotoFiles(e.target.files)}
              />
            </>
          )}

          {photoError && <p className="mt-1 text-xs text-red-600">{photoError}</p>}

          {/* Lightbox */}
          {lightbox !== null && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
              onClick={() => setLightbox(null)}
            >
              {lightbox > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-2xl text-white"
                >‹</button>
              )}
              <div className="flex max-h-screen max-w-5xl flex-col items-center px-16" onClick={(e) => e.stopPropagation()}>
                {photoSignedUrls[photos[lightbox]?.id] ? (
                  <img
                    src={photoSignedUrls[photos[lightbox].id]}
                    alt={`ფოტო ${lightbox + 1}`}
                    className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
                  />
                ) : (
                  <div className="h-64 w-96 rounded-lg bg-neutral-800" />
                )}
                <div className="mt-3 text-sm text-white/60">{lightbox + 1} / {photos.length}</div>
              </div>
              {lightbox < photos.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-2xl text-white"
                >›</button>
              )}
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
              >✕</button>
            </div>
          )}
        </div>
      )}

      {q.type === 'component_grid' && (
        <p className="text-xs italic text-neutral-500">
          კომპონენტების ბადე ფასდება მობილურ აპში.
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
