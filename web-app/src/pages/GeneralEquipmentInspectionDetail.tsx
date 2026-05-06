import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Trash2, X } from 'lucide-react';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import SignatureCanvas from '@/components/SignatureCanvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  deleteGeneralEquipmentInspection,
  getGeneralEquipmentInspection,
  newEquipmentRow,
  updateGeneralEquipmentInspection,
  type GECondition,
  type GEEquipmentRow,
} from '@/lib/data/generalEquipment';

const COND_LABEL: Record<GECondition, string> = {
  good: 'ნორმაში',
  needs_service: 'ტექ. მომსახურება',
  unusable: 'გამოუსადეგ.',
};

export default function GeneralEquipmentInspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [signingOpen, setSigningOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  const { data: item, error, isLoading } = useQuery({
    queryKey: ['generalEquipmentInspection', id],
    queryFn: () => getGeneralEquipmentInspection(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateGeneralEquipmentInspection>[1]) =>
      updateGeneralEquipmentInspection(id!, patch),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['generalEquipmentInspection', id] });
      qc.invalidateQueries({ queryKey: ['generalEquipmentInspections'] });
      if (variables.status === 'completed') setJustCompleted(true);
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  const delMutation = useMutation({
    mutationFn: () => deleteGeneralEquipmentInspection(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['generalEquipmentInspections'] });
      navigate('/inspections');
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : String(e)),
  });

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  if (!item) return <p className="text-sm text-neutral-500">აქტი ვერ მოიძებნა.</p>;

  const isDraft = item.status === 'draft';

  function patchRow(rowId: string, patch: Partial<GEEquipmentRow>) {
    if (!item) return;
    const equipment = item.equipment.map((r) => (r.id === rowId ? { ...r, ...patch } : r));
    updateMutation.mutate({ equipment });
  }

  function addRow() {
    if (!item) return;
    updateMutation.mutate({ equipment: [...item.equipment, newEquipmentRow()] });
  }

  function removeRow(rowId: string) {
    if (!item) return;
    updateMutation.mutate({ equipment: item.equipment.filter((r) => r.id !== rowId) });
  }

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
              onClick={() => window.open(`#/general-equipment/${item.id}/print`, '_blank')}
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
            {item.objectName || `ტექ. აქტი #${item.id.slice(0, 8)}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: {item.status}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`#/general-equipment/${item.id}/print`, '_blank')}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="ობიექტი" value={item.objectName} disabled={!isDraft}
            onSave={(v) => updateMutation.mutate({ objectName: v })} />
          <Field label="საქმიანობის ტიპი" value={item.activityType} disabled={!isDraft}
            onSave={(v) => updateMutation.mutate({ activityType: v })} />
          <Field label="აქტის ნომერი" value={item.actNumber} disabled={!isDraft}
            onSave={(v) => updateMutation.mutate({ actNumber: v })} />
          <Field label="დეპარტამენტი" value={item.department} disabled={!isDraft}
            onSave={(v) => updateMutation.mutate({ department: v })} />
          <Field label="ინსპექტორი" value={item.inspectorName} disabled={!isDraft}
            onSave={(v) => updateMutation.mutate({ inspectorName: v })} />
        </CardContent>
      </Card>

      {/* Equipment list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            აღჭურვილობა
            <span className="ml-2 text-sm font-normal text-neutral-400">({item.equipment.length})</span>
          </CardTitle>
          {isDraft && (
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus size={14} className="mr-1" />
              დამატება
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {item.equipment.length === 0 ? (
            <p className="text-sm text-neutral-500">სტრიქონები არ არის.</p>
          ) : (
            <ul className="space-y-3">
              {item.equipment.map((row, idx) => (
                <li key={row.id} className="rounded-lg border border-neutral-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500">#{idx + 1}</span>
                    {isDraft && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Input
                      disabled={!isDraft}
                      defaultValue={row.name}
                      onBlur={(e) => {
                        if (e.target.value !== row.name) patchRow(row.id, { name: e.target.value });
                      }}
                      placeholder="დასახელება"
                    />
                    <Input
                      disabled={!isDraft}
                      defaultValue={row.model}
                      onBlur={(e) => {
                        if (e.target.value !== row.model) patchRow(row.id, { model: e.target.value });
                      }}
                      placeholder="მოდელი"
                    />
                    <Input
                      disabled={!isDraft}
                      defaultValue={row.serialNumber}
                      onBlur={(e) => {
                        if (e.target.value !== row.serialNumber)
                          patchRow(row.id, { serialNumber: e.target.value });
                      }}
                      placeholder="სერ. ნომერი"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['good', 'needs_service', 'unusable'] as const).map((c) => {
                      const selected = row.condition === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          disabled={!isDraft}
                          onClick={() =>
                            patchRow(row.id, { condition: selected ? null : c })
                          }
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            selected
                              ? c === 'good'
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : c === 'needs_service'
                                  ? 'border-amber-600 bg-amber-600 text-white'
                                  : 'border-red-600 bg-red-600 text-white'
                              : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {COND_LABEL[c]}
                        </button>
                      );
                    })}
                  </div>
                  <Input
                    disabled={!isDraft}
                    defaultValue={row.note}
                    onBlur={(e) => {
                      if (e.target.value !== row.note) patchRow(row.id, { note: e.target.value });
                    }}
                    placeholder="შენიშვნა"
                    className="mt-2 text-xs"
                  />
                  <PhotoUploadWidget
                    paths={row.photo_paths ?? []}
                    disabled={!isDraft}
                    prefix="general-equipment"
                    inspectionId={item.id}
                    itemId={row.id}
                    onAdd={(path) =>
                      patchRow(row.id, {
                        photo_paths: [...(row.photo_paths ?? []), path],
                      })
                    }
                    onRemove={(path) =>
                      patchRow(row.id, {
                        photo_paths: (row.photo_paths ?? []).filter((p) => p !== path),
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ინსპექტორის ხელმოწერა</CardTitle>
        </CardHeader>
        <CardContent>
          {item.inspectorSignature ? (
            <div className="space-y-2">
              <img
                src={item.inspectorSignature.startsWith('data:') ? item.inspectorSignature : `data:image/png;base64,${item.inspectorSignature}`}
                alt="ხელმოწერა"
                className="h-20 rounded border border-neutral-200 bg-white object-contain p-1"
              />
              {isDraft && !signingOpen && (
                <Button variant="outline" size="sm" onClick={() => setSigningOpen(true)}>განახლება</Button>
              )}
              {isDraft && signingOpen && (
                <SignatureCanvas
                  existing={item.inspectorSignature.startsWith('data:') ? item.inspectorSignature : `data:image/png;base64,${item.inspectorSignature}`}
                  onSave={(dataUrl) => { updateMutation.mutate({ inspectorSignature: dataUrl }); setSigningOpen(false); }}
                  onCancel={() => setSigningOpen(false)}
                />
              )}
            </div>
          ) : isDraft ? (
            signingOpen ? (
              <SignatureCanvas
                onSave={(dataUrl) => { updateMutation.mutate({ inspectorSignature: dataUrl }); setSigningOpen(false); }}
                onCancel={() => setSigningOpen(false)}
              />
            ) : (
              <Button variant="outline" size="sm" onClick={() => setSigningOpen(true)}>ხელმოწერა</Button>
            )
          ) : (
            <p className="text-sm text-neutral-500">ხელმოწერა არ არის.</p>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">დასკვნა</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isDraft ? (
            <>
              <textarea
                rows={3}
                defaultValue={item.conclusion ?? ''}
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== item.conclusion) updateMutation.mutate({ conclusion: v });
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="დასკვნის ტექსტი"
              />
              <Button
                size="sm"
                onClick={() => updateMutation.mutate({ status: 'completed' })}
                disabled={updateMutation.isPending}
              >
                დასრულება
              </Button>
            </>
          ) : (
            <p className="text-sm text-neutral-700">{item.conclusion || '—'}</p>
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
