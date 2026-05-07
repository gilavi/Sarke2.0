import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePendingCreate } from '@/lib/usePendingCreate';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import DeleteButton from '@/components/DeleteButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import SignatureCanvas from '@/components/SignatureCanvas';
import FieldInput from '@/components/FieldInput';
import WizardSteps, { WizardNav } from '@/components/WizardSteps';
import {
  BOBCAT_ITEMS,
  BOBCAT_TEMPLATE_ID,
  LARGE_LOADER_ITEMS,
  createBobcatInspection,
  deleteBobcatInspection,
  getBobcatInspection,
  updateBobcatInspection,
  type BobcatChecklistEntry,
  type BobcatInspection,
  type BobcatInspectionType,
  type BobcatItemResult,
  type BobcatItemState,
  type BobcatVerdict,
} from '@/lib/data/bobcat';

const RESULT_LABEL: Record<BobcatItemResult, string> = {
  good: 'ნორმაში',
  deficient: 'ხარვეზია',
  unusable: 'გამოუსადეგ.',
};

const VERDICT_LABEL: Record<BobcatVerdict, string> = {
  approved: 'დაშვებულია',
  limited: 'პირობით',
  rejected: 'არ დაიშვება',
};

const CATEGORY_LABEL: Record<string, string> = {
  A: 'A — თვლები და სამუხრუჭე სისტემა',
  B: 'B — ციცხვი, მკლავი და ჰიდრავლიკა',
  C: 'C — ძრავი',
  D: 'D — კაბინა, მართვა, უსაფრთხოება',
};

function catalogFor(templateId: string | null): BobcatChecklistEntry[] {
  return templateId === BOBCAT_TEMPLATE_ID ? BOBCAT_ITEMS : LARGE_LOADER_ITEMS;
}

type PendingBobcat = Parameters<typeof createBobcatInspection>[0];

export default function BobcatInspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { pendingCreate, lazyCreate } = usePendingCreate<PendingBobcat>();
  const isPending = id === 'draft';

  const { data: item, error, isLoading } = useQuery({
    queryKey: ['bobcatInspection', id],
    queryFn: () => getBobcatInspection(id!),
    enabled: !!id && !isPending,
  });

  const [signingOpen, setSigningOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [step, setStep] = useState(0);
  const [pdfOpen, setPdfOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateBobcatInspection>[1]) =>
      updateBobcatInspection(id!, patch),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['bobcatInspection', id] });
      qc.invalidateQueries({ queryKey: ['bobcatInspections'] });
      if (variables.status === 'completed') setJustCompleted(true);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const delMutation = useMutation({
    mutationFn: () => deleteBobcatInspection(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bobcatInspections'] });
      navigate('/inspections');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  // When not yet saved, Step 0 field saves are no-ops (data lives in pendingCreate)
  function save(patch: Parameters<typeof updateBobcatInspection>[1]) {
    if (isPending) return;
    updateMutation.mutate(patch);
  }

  async function patchItem(itemId: number, patch: Partial<BobcatItemState>) {
    if (isPending && pendingCreate) {
      try {
        const realId = await lazyCreate(createBobcatInspection);
        if (!realId) return;
        const templateId = pendingCreate.templateId ?? BOBCAT_TEMPLATE_ID;
        const catalog = catalogFor(templateId);
        const initialItems: BobcatItemState[] = catalog.map((e) => ({
          id: e.id, result: null, comment: null, photo_paths: [],
        }));
        const patched = initialItems.map((it) => it.id === itemId ? { ...it, ...patch } : it);
        await updateBobcatInspection(realId, { items: patched });
        qc.invalidateQueries({ queryKey: ['bobcatInspections'] });
        navigate(`/bobcat/${realId}`, { replace: true, state: {} });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (!item) return;
    const items = item.items.map((it) => it.id === itemId ? { ...it, ...patch } : it);
    updateMutation.mutate({ items });
  }

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  if (!item && !isPending) return <p className="text-sm text-neutral-500">აქტი ვერ მოიძებნა.</p>;

  const effectiveItem: BobcatInspection = item ?? {
    id: 'draft',
    projectId: pendingCreate?.projectId ?? '',
    templateId: pendingCreate?.templateId ?? BOBCAT_TEMPLATE_ID,
    userId: '',
    status: 'draft',
    company: pendingCreate?.company ?? null,
    address: null,
    equipmentModel: pendingCreate?.equipmentModel ?? null,
    registrationNumber: pendingCreate?.registrationNumber ?? null,
    department: pendingCreate?.department ?? null,
    inspectorName: pendingCreate?.inspectorName ?? null,
    inspectionDate: pendingCreate?.inspectionDate ?? new Date().toISOString().slice(0, 10),
    inspectionType: (pendingCreate?.inspectionType ?? 'pre_work') as BobcatInspectionType,
    items: [],
    verdict: null,
    notes: null,
    inspectorSignature: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  const isDraft = effectiveItem.status === 'draft';
  const catalog = catalogFor(effectiveItem.templateId);
  const itemsById = new Map<number, BobcatItemState>(effectiveItem.items.map((i) => [i.id, i]));

  const grouped = catalog.reduce<Record<string, BobcatChecklistEntry[]>>((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category].push(entry);
    return acc;
  }, {});

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
              onClick={() => setPdfOpen(true)}
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
            {effectiveItem.equipmentModel || effectiveItem.company || 'ციცხვიანი დამტვირთველის აქტი'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {effectiveItem.status === 'completed' ? 'დასრულებული' : 'დრაფტი'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isPending && (
            <Button variant="outline" size="sm" onClick={() => setPdfOpen(true)}>
              <FileText size={14} className="mr-1" />
              PDF
            </Button>
          )}
          {!isPending && (
            <DeleteButton onDelete={() => delMutation.mutate()} isPending={delMutation.isPending} />
          )}
        </div>
      </header>

      <WizardSteps
        steps={[{ label: 'ინფო' }, { label: 'შემოწმება' }, { label: 'დასკვნა' }]}
        current={step}
        onStep={setStep}
      />

      {/* Step 0 — General info */}
      {step === 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <FieldInput
                label="კომპანია"
                value={effectiveItem.company}
                disabled={!isDraft}
                onSave={(v) => save({ company: v })}
              />
              <FieldInput
                label="მოდელი"
                value={effectiveItem.equipmentModel}
                disabled={!isDraft}
                onSave={(v) => save({ equipmentModel: v })}
              />
              <FieldInput
                label="სარეგ. ნომერი"
                value={effectiveItem.registrationNumber}
                disabled={!isDraft}
                onSave={(v) => save({ registrationNumber: v })}
              />
              <FieldInput
                label="დეპარტამენტი"
                value={effectiveItem.department}
                disabled={!isDraft}
                onSave={(v) => save({ department: v })}
              />
              <FieldInput
                label="ინსპექტორი"
                value={effectiveItem.inspectorName}
                disabled={!isDraft}
                onSave={(v) => save({ inspectorName: v })}
              />
            </CardContent>
          </Card>
          <WizardNav current={step} total={3} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {/* Step 1 — Checklist */}
      {step === 1 && (
        <>
          {Object.entries(grouped).map(([cat, entries]) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle className="text-base">{CATEGORY_LABEL[cat] ?? cat}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-neutral-200">
                  {entries.map((entry) => {
                    const state = itemsById.get(entry.id) ?? {
                      id: entry.id,
                      result: null,
                      comment: null,
                      photo_paths: [],
                    };
                    return (
                      <li key={entry.id} className="py-3">
                        <div className="text-sm font-medium text-neutral-900">
                          {entry.id}. {entry.label}
                        </div>
                        <div className="text-xs text-neutral-600">{entry.description}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(['good', 'deficient', 'unusable'] as const).map((r) => {
                            const selected = state.result === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                disabled={!isDraft}
                                onClick={() =>
                                  patchItem(entry.id, { result: selected ? null : r })
                                }
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                  selected
                                    ? r === 'good'
                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : r === 'deficient'
                                        ? 'border-amber-600 bg-amber-600 text-white'
                                        : 'border-red-600 bg-red-600 text-white'
                                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {r === 'unusable' && entry.unusableLabel
                                  ? entry.unusableLabel
                                  : RESULT_LABEL[r]}
                              </button>
                            );
                          })}
                        </div>
                        <Input
                          disabled={!isDraft}
                          defaultValue={state.comment ?? ''}
                          onBlur={(e) => {
                            const v = e.target.value || null;
                            if (v !== (state.comment ?? null)) {
                              patchItem(entry.id, { comment: v });
                            }
                          }}
                          placeholder="კომენტარი"
                          className="mt-2 text-xs"
                        />
                        <PhotoUploadWidget
                          paths={state.photo_paths ?? []}
                          disabled={!isDraft}
                          prefix="bobcat"
                          inspectionId={effectiveItem.id}
                          itemId={entry.id}
                          onAdd={(path) =>
                            patchItem(entry.id, {
                              photo_paths: [...(state.photo_paths ?? []), path],
                            })
                          }
                          onRemove={(path) =>
                            patchItem(entry.id, {
                              photo_paths: (state.photo_paths ?? []).filter((p) => p !== path),
                            })
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
          <WizardNav current={step} total={3} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {/* Step 2 — Signature + Summary */}
      {step === 2 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ინსპექტორის ხელმოწერა</CardTitle>
            </CardHeader>
            <CardContent>
              {signingOpen && isDraft ? (
                <SignatureCanvas
                  existing={effectiveItem.inspectorSignature
                    ? (effectiveItem.inspectorSignature.startsWith('data:') ? effectiveItem.inspectorSignature : `data:image/png;base64,${effectiveItem.inspectorSignature}`)
                    : undefined}
                  onSave={(dataUrl) => { save({ inspectorSignature: dataUrl }); setSigningOpen(false); }}
                  onCancel={() => setSigningOpen(false)}
                />
              ) : effectiveItem.inspectorSignature ? (
                <div className="space-y-2">
                  <img
                    src={effectiveItem.inspectorSignature.startsWith('data:') ? effectiveItem.inspectorSignature : `data:image/png;base64,${effectiveItem.inspectorSignature}`}
                    alt="ხელმოწერა"
                    className="h-20 rounded border border-neutral-200 bg-white object-contain p-1"
                  />
                  {isDraft && (
                    <Button variant="outline" size="sm" onClick={() => setSigningOpen(true)}>განახლება</Button>
                  )}
                </div>
              ) : isDraft ? (
                <Button variant="outline" size="sm" onClick={() => setSigningOpen(true)}>ხელმოწერა</Button>
              ) : (
                <p className="text-sm text-neutral-500">ხელმოწერა არ არის.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">დასკვნა</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isDraft ? (
                <>
                  <div className="space-y-1">
                    <Label>დასკვნა</Label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(VERDICT_LABEL) as BobcatVerdict[]).map((v) => {
                        const selected = effectiveItem.verdict === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => save({ verdict: selected ? null : v })}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              selected
                                ? 'border-brand-600 bg-brand-600 text-white'
                                : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                            }`}
                          >
                            {VERDICT_LABEL[v]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>შენიშვნები</Label>
                    <textarea
                      rows={3}
                      defaultValue={effectiveItem.notes ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== effectiveItem.notes) save({ notes: v });
                      }}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => save({ status: 'completed' })}
                    disabled={updateMutation.isPending || isPending}
                  >
                    დასრულება
                  </Button>
                </>
              ) : (
                <div className="space-y-1 text-sm text-neutral-700">
                  <div>
                    დასკვნა: {effectiveItem.verdict ? VERDICT_LABEL[effectiveItem.verdict] : '—'}
                  </div>
                  <div>შენიშვნები: {effectiveItem.notes || '—'}</div>
                </div>
              )}
            </CardContent>
          </Card>
          <WizardNav current={step} total={3} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {pdfOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
          <div className="flex items-center justify-between bg-white px-4 py-2 shadow">
            <button
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
              onClick={() => setPdfOpen(false)}
            >
              ✕ დახურვა
            </button>
            <button
              className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              onClick={() => iframeRef.current?.contentWindow?.print()}
            >
              ბეჭდვა
            </button>
          </div>
          <iframe
            ref={iframeRef}
            src={`#/bobcat/${effectiveItem.id}/print?preview=1`}
            className="flex-1 w-full border-0 bg-white"
            title="PDF გადახედვა"
          />
        </div>
      )}
    </div>
  );
}

