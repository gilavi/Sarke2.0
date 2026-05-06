import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateBobcatInspection>[1]) =>
      updateBobcatInspection(id!, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bobcatInspection', id] });
      qc.invalidateQueries({ queryKey: ['bobcatInspections'] });
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
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link to="/inspections" className="text-sm text-brand-600 hover:underline">
            ← აქტები
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
            {item.equipmentModel || item.company || 'ციცხვიანი დამტვირთველის აქტი'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {item.status}</p>
        </div>
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
      </header>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* General info */}
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
            label="ინსპექტორი"
            value={item.inspectorName}
            disabled={!isDraft}
            onSave={(v) => updateMutation.mutate({ inspectorName: v })}
          />
        </CardContent>
      </Card>

      {/* Checklist */}
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
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}

      {/* Summary */}
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
