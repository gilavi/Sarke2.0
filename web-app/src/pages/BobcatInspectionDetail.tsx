import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import SignatureCanvas from '@/components/SignatureCanvas';
import WizardSteps, { WizardNav } from '@/components/WizardSteps';
import {
  BOBCAT_ITEMS,
  BOBCAT_TEMPLATE_ID,
  LARGE_LOADER_ITEMS,
  deleteBobcatInspection,
  getBobcatInspection,
  updateBobcatInspection,
  type BobcatChecklistEntry,
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

export default function BobcatInspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: item, error, isLoading } = useQuery({
    queryKey: ['bobcatInspection', id],
    queryFn: () => getBobcatInspection(id!),
    enabled: !!id,
  });

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [signingOpen, setSigningOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [step, setStep] = useState(0);

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateBobcatInspection>[1]) =>
      updateBobcatInspection(id!, patch),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['bobcatInspection', id] });
      qc.invalidateQueries({ queryKey: ['bobcatInspections'] });
      if (variables.status === 'completed') setJustCompleted(true);
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  const delMutation = useMutation({
    mutationFn: () => deleteBobcatInspection(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bobcatInspections'] });
      navigate('/inspections');
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  function patchItem(itemId: number, patch: Partial<BobcatItemState>) {
    if (!item) return;
    const items = item.items.map((it) =>
      it.id === itemId ? { ...it, ...patch } : it,
    );
    updateMutation.mutate({ items });
  }

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  if (!item) return <p className="text-sm text-neutral-500">აქტი ვერ მოიძებნა.</p>;

  const isDraft = item.status === 'draft';
  const catalog = catalogFor(item.templateId);
  const itemsById = new Map<number, BobcatItemState>(item.items.map((i) => [i.id, i]));

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
              onClick={() => window.open(`#/bobcat/${id}/print`, '_blank')}
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
            {item.equipmentModel || item.company || 'ციცხვიანი დამტვირთველის აქტი'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {item.status === 'completed' ? 'დასრულებული' : 'დრაფტი'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`#/bobcat/${item.id}/print`, '_blank')}
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
                onClick={() => delMutation.mutate()}
                disabled={delMutation.isPending}
              >
                {delMutation.isPending ? 'იშლება…' : 'წაშლა'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={delMutation.isPending}
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

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

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
              <Field
                label="კომპანია"
                value={item.company}
                disabled={!isDraft}
                onSave={(v) => updateMutation.mutate({ company: v })}
              />
              <Field
                label="მოდელი"
                value={item.equipmentModel}
                disabled={!isDraft}
                onSave={(v) => updateMutation.mutate({ equipmentModel: v })}
              />
              <Field
                label="სარეგ. ნომერი"
                value={item.registrationNumber}
                disabled={!isDraft}
                onSave={(v) => updateMutation.mutate({ registrationNumber: v })}
              />
              <Field
                label="დეპარტამენტი"
                value={item.department}
                disabled={!isDraft}
                onSave={(v) => updateMutation.mutate({ department: v })}
              />
              <Field
                label="ინსპექტორი"
                value={item.inspectorName}
                disabled={!isDraft}
                onSave={(v) => updateMutation.mutate({ inspectorName: v })}
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
                          inspectionId={item.id}
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
                  existing={item.inspectorSignature
                    ? (item.inspectorSignature.startsWith('data:') ? item.inspectorSignature : `data:image/png;base64,${item.inspectorSignature}`)
                    : undefined}
                  onSave={(dataUrl) => { updateMutation.mutate({ inspectorSignature: dataUrl }); setSigningOpen(false); }}
                  onCancel={() => setSigningOpen(false)}
                />
              ) : item.inspectorSignature ? (
                <div className="space-y-2">
                  <img
                    src={item.inspectorSignature.startsWith('data:') ? item.inspectorSignature : `data:image/png;base64,${item.inspectorSignature}`}
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
                        const selected = item.verdict === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() =>
                              updateMutation.mutate({ verdict: selected ? null : v })
                            }
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
                      defaultValue={item.notes ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== item.notes) updateMutation.mutate({ notes: v });
                      }}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ status: 'completed' })}
                    disabled={updateMutation.isPending}
                  >
                    დასრულება
                  </Button>
                </>
              ) : (
                <div className="space-y-1 text-sm text-neutral-700">
                  <div>
                    დასკვნა: {item.verdict ? VERDICT_LABEL[item.verdict] : '—'}
                  </div>
                  <div>შენიშვნები: {item.notes || '—'}</div>
                </div>
              )}
            </CardContent>
          </Card>
          <WizardNav current={step} total={3} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  disabled,
  onSave,
}: {
  label: string;
  value: string | null;
  disabled: boolean;
  onSave: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        disabled={disabled}
        defaultValue={value ?? ''}
        onBlur={(e) => {
          const v = e.target.value.trim() || null;
          if (v !== (value ?? null)) onSave(v);
        }}
      />
    </div>
  );
}
