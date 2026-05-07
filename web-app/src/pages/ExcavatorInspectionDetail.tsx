import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePendingCreate } from '@/lib/usePendingCreate';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import DeleteButton from '@/components/DeleteButton';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import SignatureCanvas from '@/components/SignatureCanvas';
import FieldInput from '@/components/FieldInput';
import WizardSteps, { WizardNav } from '@/components/WizardSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CABIN_ITEMS,
  ENGINE_ITEMS,
  EXCAVATOR_VERDICT_LABEL,
  MAINTENANCE_ITEMS,
  SAFETY_ITEMS,
  UNDERCARRIAGE_ITEMS,
  createExcavatorInspection,
  deleteExcavatorInspection,
  getExcavatorInspection,
  updateExcavatorInspection,
  type ExcavatorChecklistEntry,
  type ExcavatorChecklistItemState,
  type ExcavatorChecklistResult,
  type ExcavatorInspection,
  type ExcavatorMaintenanceItemState,
  type ExcavatorVerdict,
} from '@/lib/data/excavator';

const RESULT_LABEL: Record<Exclude<ExcavatorChecklistResult, null>, string> = {
  good: 'ნორმაში',
  deficient: 'ხარვეზი',
  unusable: 'გამოუსადეგ.',
};

interface SectionDef {
  key: 'engine' | 'undercarriage' | 'cabin' | 'safety';
  title: string;
  items: ExcavatorChecklistEntry[];
  field:
    | 'engineItems'
    | 'undercarriageItems'
    | 'cabinItems'
    | 'safetyItems';
}

const SECTIONS: SectionDef[] = [
  { key: 'engine', title: 'ძრავი', items: ENGINE_ITEMS, field: 'engineItems' },
  { key: 'undercarriage', title: 'ხოდოვაი / მკლავი', items: UNDERCARRIAGE_ITEMS, field: 'undercarriageItems' },
  { key: 'cabin', title: 'კაბინა', items: CABIN_ITEMS, field: 'cabinItems' },
  { key: 'safety', title: 'უსაფრთხოება', items: SAFETY_ITEMS, field: 'safetyItems' },
];

type PendingExcavator = Parameters<typeof createExcavatorInspection>[0];

const EMPTY_SPECS = { weight: '—', engine: '—', power: '—', depth: '—', travel: '—', maxReach: '—' };

export default function ExcavatorInspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { pendingCreate, lazyCreate } = usePendingCreate<PendingExcavator>();
  const isPending = id === 'draft';

  const [signingOpen, setSigningOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [step, setStep] = useState(0);
  const [pdfOpen, setPdfOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: item, error, isLoading } = useQuery({
    queryKey: ['excavatorInspection', id],
    queryFn: () => getExcavatorInspection(id!),
    enabled: !!id && !isPending,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateExcavatorInspection>[1]) =>
      updateExcavatorInspection(id!, patch),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['excavatorInspection', id] });
      qc.invalidateQueries({ queryKey: ['excavatorInspections'] });
      if (variables.status === 'completed') setJustCompleted(true);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const delMutation = useMutation({
    mutationFn: () => deleteExcavatorInspection(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['excavatorInspections'] });
      navigate('/inspections');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  if (!item && !isPending) return <p className="text-sm text-neutral-500">აქტი ვერ მოიძებნა.</p>;

  const effectiveItem: ExcavatorInspection = item ?? {
    id: 'draft',
    status: 'draft',
    projectId: pendingCreate?.projectId ?? '',
    templateId: '',
    userId: '',
    serialNumber: pendingCreate?.serialNumber ?? null,
    registrationNumber: null,
    inventoryNumber: pendingCreate?.inventoryNumber ?? null,
    projectName: null,
    department: pendingCreate?.department ?? null,
    inspectorName: pendingCreate?.inspectorName ?? null,
    inspectorPosition: null,
    inspectionDate: pendingCreate?.inspectionDate ?? new Date().toISOString().slice(0, 10),
    lastInspectionDate: null,
    motoHours: null,
    machineSpecs: EMPTY_SPECS,
    engineItems: [],
    undercarriageItems: [],
    cabinItems: [],
    safetyItems: [],
    maintenanceItems: [],
    inspectorSignature: null,
    verdict: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  const isDraft = effectiveItem.status === 'draft';

  // Step 0 field saves are no-ops when pending (data lives in pendingCreate)
  function save(patch: Parameters<typeof updateExcavatorInspection>[1]) {
    if (isPending) return;
    updateMutation.mutate(patch);
  }

  async function patchSection(field: SectionDef['field'], itemId: number, patch: Partial<ExcavatorChecklistItemState>) {
    if (isPending && pendingCreate) {
      try {
        const realId = await lazyCreate(createExcavatorInspection);
        if (!realId) return;
        const sectionDef = SECTIONS.find((s) => s.field === field)!;
        const initial: ExcavatorChecklistItemState[] = sectionDef.items.map((e) => ({
          id: e.id, result: null, comment: null, photo_paths: [],
        }));
        const patched = initial.map((it) => it.id === itemId ? { ...it, ...patch } : it);
        await updateExcavatorInspection(realId, { [field]: patched } as Parameters<typeof updateExcavatorInspection>[1]);
        qc.invalidateQueries({ queryKey: ['excavatorInspections'] });
        navigate(`/excavator/${realId}`, { replace: true, state: {} });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (!item) return;
    const list = item[field] as ExcavatorChecklistItemState[];
    const next = list.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
    updateMutation.mutate({ [field]: next } as Parameters<typeof updateExcavatorInspection>[1]);
  }

  async function patchMaintenance(itemId: number, patch: Partial<ExcavatorMaintenanceItemState>) {
    if (isPending && pendingCreate) {
      try {
        const realId = await lazyCreate(createExcavatorInspection);
        if (!realId) return;
        const initial = MAINTENANCE_ITEMS.map((m) => ({ id: m.id, answer: null as null, date: null as null }));
        const next = initial.map((m) => m.id === itemId ? { ...m, ...patch } : m);
        await updateExcavatorInspection(realId, { maintenanceItems: next });
        qc.invalidateQueries({ queryKey: ['excavatorInspections'] });
        navigate(`/excavator/${realId}`, { replace: true, state: {} });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (!item) return;
    const next = item.maintenanceItems.map((m) => (m.id === itemId ? { ...m, ...patch } : m));
    updateMutation.mutate({ maintenanceItems: next });
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
            ექსკავატორი — {effectiveItem.serialNumber || (isPending ? 'ახალი' : `#${effectiveItem.id.slice(0, 8)}`)}
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

      {/* Step 0 — Info */}
      {step === 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ტექნიკის მახასიათებლები</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm text-neutral-700">
              <div>წონა: {effectiveItem.machineSpecs.weight}</div>
              <div>ძრავი: {effectiveItem.machineSpecs.engine}</div>
              <div>სიმძლავრე: {effectiveItem.machineSpecs.power}</div>
              <div>ჩაღრმავება: {effectiveItem.machineSpecs.depth}</div>
              <div>გადაადგილება: {effectiveItem.machineSpecs.travel}</div>
              <div>მაქს. წვდომა: {effectiveItem.machineSpecs.maxReach}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <FieldInput
                label="სერ. ნომერი"
                value={effectiveItem.serialNumber}
                disabled={!isDraft}
                onSave={(v) => save({ serialNumber: v })}
              />
              <FieldInput
                label="ინვ. ნომერი"
                value={effectiveItem.inventoryNumber}
                disabled={!isDraft}
                onSave={(v) => save({ inventoryNumber: v })}
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
              <FieldInput
                label="თანამდებობა"
                value={effectiveItem.inspectorPosition}
                disabled={!isDraft}
                onSave={(v) => save({ inspectorPosition: v })}
              />
              <div className="space-y-1">
                <Label>შემოწმების თარიღი</Label>
                <Input
                  type="date"
                  disabled={!isDraft}
                  defaultValue={effectiveItem.inspectionDate ? effectiveItem.inspectionDate.slice(0, 10) : ''}
                  onBlur={(e) => {
                    const v = e.target.value || null;
                    if (v !== (effectiveItem.inspectionDate ? effectiveItem.inspectionDate.slice(0, 10) : null))
                      save({ inspectionDate: v });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>წინა შემოწმების თარიღი</Label>
                <Input
                  type="date"
                  disabled={!isDraft}
                  defaultValue={effectiveItem.lastInspectionDate ? effectiveItem.lastInspectionDate.slice(0, 10) : ''}
                  onBlur={(e) => {
                    const v = e.target.value || null;
                    if (v !== (effectiveItem.lastInspectionDate ? effectiveItem.lastInspectionDate.slice(0, 10) : null))
                      save({ lastInspectionDate: v });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>მუშა საათები</Label>
                <Input
                  type="number"
                  disabled={!isDraft}
                  defaultValue={effectiveItem.motoHours ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value === '' ? null : Number(e.target.value);
                    if (v !== effectiveItem.motoHours) save({ motoHours: v });
                  }}
                />
              </div>
            </CardContent>
          </Card>
          <WizardNav current={step} total={3} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {/* Step 1 — Checklist */}
      {step === 1 && (
        <>
          {SECTIONS.map((s) => {
            const stateList = effectiveItem[s.field] as ExcavatorChecklistItemState[];
            const stateById = new Map(stateList.map((it) => [it.id, it]));
            return (
              <Card key={s.key}>
                <CardHeader>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-neutral-200">
                    {s.items.map((entry) => {
                      const st = stateById.get(entry.id) ?? {
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
                              const selected = st.result === r;
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  disabled={!isDraft}
                                  onClick={() =>
                                    patchSection(s.field, entry.id, {
                                      result: selected ? null : r,
                                    })
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
                                  {RESULT_LABEL[r]}
                                </button>
                              );
                            })}
                          </div>
                          <Input
                            disabled={!isDraft}
                            defaultValue={st.comment ?? ''}
                            onBlur={(e) => {
                              const v = e.target.value || null;
                              if (v !== (st.comment ?? null)) {
                                patchSection(s.field, entry.id, { comment: v });
                              }
                            }}
                            placeholder="კომენტარი"
                            className="mt-2 text-xs"
                          />
                          <PhotoUploadWidget
                            paths={st.photo_paths ?? []}
                            disabled={!isDraft}
                            prefix="excavator"
                            inspectionId={effectiveItem.id}
                            itemId={entry.id}
                            onAdd={(path) =>
                              patchSection(s.field, entry.id, {
                                photo_paths: [...(st.photo_paths ?? []), path],
                              })
                            }
                            onRemove={(path) =>
                              patchSection(s.field, entry.id, {
                                photo_paths: (st.photo_paths ?? []).filter((p) => p !== path),
                              })
                            }
                          />
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ტექ. მომსახურება</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-neutral-200">
                {MAINTENANCE_ITEMS.map((m) => {
                  const st =
                    effectiveItem.maintenanceItems.find((x) => x.id === m.id) ??
                    ({ id: m.id, answer: null, date: null } as ExcavatorMaintenanceItemState);
                  return (
                    <li key={m.id} className="space-y-2 py-3">
                      <div className="text-sm text-neutral-900">{m.label}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(['yes', 'no'] as const).map((a) => {
                          const selected = st.answer === a;
                          return (
                            <button
                              key={a}
                              type="button"
                              disabled={!isDraft}
                              onClick={() => patchMaintenance(m.id, { answer: selected ? null : a })}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                selected
                                  ? a === 'yes'
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-red-600 bg-red-600 text-white'
                                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {a === 'yes' ? 'კი' : 'არა'}
                            </button>
                          );
                        })}
                        <Input
                          type="date"
                          disabled={!isDraft}
                          defaultValue={st.date ?? ''}
                          onBlur={(e) => {
                            const v = e.target.value || null;
                            if (v !== (st.date ?? null)) patchMaintenance(m.id, { date: v });
                          }}
                          className="max-w-[180px]"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <WizardNav current={step} total={3} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {/* Step 2 — Signature + Verdict */}
      {step === 2 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ინსპექტორის ხელმოწერა</CardTitle>
            </CardHeader>
            <CardContent>
              {effectiveItem.inspectorSignature ? (
                <div className="space-y-2">
                  <img
                    src={effectiveItem.inspectorSignature.startsWith('data:') ? effectiveItem.inspectorSignature : `data:image/png;base64,${effectiveItem.inspectorSignature}`}
                    alt="ხელმოწერა"
                    className="h-20 rounded border border-neutral-200 bg-white object-contain p-1"
                  />
                  {isDraft && !signingOpen && (
                    <Button variant="outline" size="sm" onClick={() => setSigningOpen(true)}>განახლება</Button>
                  )}
                  {isDraft && signingOpen && (
                    <SignatureCanvas
                      existing={effectiveItem.inspectorSignature.startsWith('data:') ? effectiveItem.inspectorSignature : `data:image/png;base64,${effectiveItem.inspectorSignature}`}
                      onSave={(dataUrl) => { save({ inspectorSignature: dataUrl }); setSigningOpen(false); }}
                      onCancel={() => setSigningOpen(false)}
                    />
                  )}
                </div>
              ) : isDraft ? (
                signingOpen ? (
                  <SignatureCanvas
                    onSave={(dataUrl) => { save({ inspectorSignature: dataUrl }); setSigningOpen(false); }}
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
                      {(Object.keys(EXCAVATOR_VERDICT_LABEL) as ExcavatorVerdict[]).map((v) => {
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
                            {EXCAVATOR_VERDICT_LABEL[v]}
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
                  <div>დასკვნა: {effectiveItem.verdict ? EXCAVATOR_VERDICT_LABEL[effectiveItem.verdict] : '—'}</div>
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
            src={`#/excavator/${effectiveItem.id}/print?preview=1`}
            className="flex-1 w-full border-0 bg-white"
            title="PDF გადახედვა"
          />
        </div>
      )}
    </div>
  );
}

