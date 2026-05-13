import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import DeleteButton from '@/components/DeleteButton';
import FieldInput from '@/components/FieldInput';
import WizardSteps, { WizardNav } from '@/components/WizardSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getCargoPlatformInspection,
  deleteCargoPlatformInspection,
  updateCargoPlatformInspection,
  newCargoRow,
  cpTotalWeight,
  CP_ITEMS,
  CP_SECTION_LABELS,
  CP_VERDICT_LABEL,
  CP_RESULT_LABEL,
  type CPVerdict,
  type CPResult,
  type CPCargoRow,
  type CPItemState,
} from '@/lib/data/cargoPlatform';

const VERDICT_COLOR: Record<CPVerdict, string> = {
  approved:    'border-emerald-600 bg-emerald-600 text-white',
  conditional: 'border-amber-500 bg-amber-500 text-white',
  rejected:    'border-red-600 bg-red-600 text-white',
};

const RESULT_COLOR: Record<CPResult, string> = {
  good: 'border-emerald-600 bg-emerald-600 text-white',
  fix:  'border-amber-500 bg-amber-500 text-white',
  na:   'border-neutral-400 bg-neutral-400 text-white',
};

export default function CargoPlatformInspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: item, error, isLoading } = useQuery({
    queryKey: ['cargoPlatformInspection', id],
    queryFn: () => getCargoPlatformInspection(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateCargoPlatformInspection>[1]) =>
      updateCargoPlatformInspection(id!, patch),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['cargoPlatformInspection', id] });
      qc.invalidateQueries({ queryKey: ['cargoPlatformInspections'] });
      if (variables.status === 'completed') setJustCompleted(true);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const delMutation = useMutation({
    mutationFn: () => deleteCargoPlatformInspection(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cargoPlatformInspections'] });
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
  if (!item) return <p className="text-sm text-neutral-500">აქტი ვერ მოიძებნა.</p>;

  const isDraft = item.status === 'draft';

  function save(patch: Parameters<typeof updateCargoPlatformInspection>[1]) {
    updateMutation.mutate(patch);
  }

  // ── Cargo rows ──────────────────────────────────────────────────────────────

  function addCargoRow() {
    save({ cargo: [...item!.cargo, newCargoRow()] });
  }

  function removeCargoRow(rowId: string) {
    save({ cargo: item!.cargo.filter((r) => r.id !== rowId) });
  }

  function patchCargoRow(rowId: string, patch: Partial<CPCargoRow>) {
    save({ cargo: item!.cargo.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) });
  }

  // ── Checklist items ─────────────────────────────────────────────────────────

  function patchItem(itemId: number, patch: Partial<CPItemState>) {
    save({ items: item!.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) });
  }

  const canComplete = isDraft && !!item.verdict;

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
            {item.company || `პლატფ. #${item.id.slice(0, 8)}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            სტატუსი: {item.status === 'completed' ? 'დასრულებული' : 'დრაფტი'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPdfOpen(true)}>
            <FileText size={14} className="mr-1" />
            PDF
          </Button>
          <DeleteButton onDelete={() => delMutation.mutate()} isPending={delMutation.isPending} />
        </div>
      </header>

      <WizardSteps
        steps={[
          { label: 'ინფო' },
          { label: 'პლატფ.' },
          { label: 'ტვირთი' },
          { label: 'შემოწმება' },
          { label: 'დასკვნა' },
          { label: 'ხელმოწ.' },
        ]}
        current={step}
        onStep={setStep}
      />

      {/* Step 0 — General info */}
      {step === 0 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <FieldInput label="კომპანია" value={item.company || null} disabled={!isDraft}
                onSave={(v) => save({ company: v })} />
              <FieldInput label="მისამართი" value={item.address || null} disabled={!isDraft}
                onSave={(v) => save({ address: v })} />
              <FieldInput label="ინსპექტორი" value={item.inspectorName || null} disabled={!isDraft}
                onSave={(v) => save({ inspectorName: v })} />
              <FieldInput label="სართული / ზონა" value={item.floorZone || null} disabled={!isDraft}
                onSave={(v) => save({ floorZone: v })} />
              <div className="space-y-1">
                <Label>შემოწმების თარიღი</Label>
                <Input
                  type="date"
                  disabled={!isDraft}
                  defaultValue={item.inspectionDate ? item.inspectionDate.slice(0, 10) : ''}
                  onBlur={(e) => {
                    const v = e.target.value || null;
                    if (v !== (item.inspectionDate ? item.inspectionDate.slice(0, 10) : null))
                      save({ inspectionDate: v });
                  }}
                />
              </div>
            </CardContent>
          </Card>
          <WizardNav current={step} total={6} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {/* Step 1 — Platform ID */}
      {step === 1 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">პლატფორმის იდენტიფიკაცია</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldInput label="ტიპი / მოდელი" value={item.platformTypeModel || null} disabled={!isDraft}
                  onSave={(v) => save({ platformTypeModel: v })} />
              </div>
              <div className="space-y-1">
                <Label>სიგრძე (მ)</Label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={!isDraft}
                  defaultValue={item.platformLength ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value ? parseFloat(e.target.value) : null;
                    if (v !== item.platformLength) save({ platformLength: v });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>სიგანე (მ)</Label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={!isDraft}
                  defaultValue={item.platformWidth ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value ? parseFloat(e.target.value) : null;
                    if (v !== item.platformWidth) save({ platformWidth: v });
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldInput label="ფერი / განსხვავებები" value={item.platformColorDesc || null} disabled={!isDraft}
                  onSave={(v) => save({ platformColorDesc: v })} />
              </div>
              <PillPair
                label="გვერდითი მოაჯირი"
                value={item.sideGuardrail}
                options={[['none', 'არ აქვს'], ['complete', 'სრულია']]}
                disabled={!isDraft}
                onChange={(v) => save({ sideGuardrail: v })}
              />
              <PillPair
                label="წინა მოაჯირი"
                value={item.frontGuardrail}
                options={[['none', 'არ აქვს'], ['complete', 'სრულია']]}
                disabled={!isDraft}
                onChange={(v) => save({ frontGuardrail: v })}
              />
              <PillPair
                label="მოაჯირის სიმაღლე"
                value={item.guardrailHeight}
                options={[['non_standard', 'არასტანდარტული'], ['standard', 'სტანდარტული']]}
                disabled={!isDraft}
                onChange={(v) => save({ guardrailHeight: v })}
              />
            </CardContent>
          </Card>
          <WizardNav current={step} total={6} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {/* Step 2 — Cargo table */}
      {step === 2 && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                ტვირთის იდენტიფიკაცია
                <span className="ml-2 text-sm font-normal text-neutral-400">({item.cargo.length} სტრ.)</span>
              </CardTitle>
              {isDraft && (
                <Button variant="outline" size="sm" onClick={addCargoRow}>
                  <Plus size={14} className="mr-1" />
                  დამატება
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {item.cargo.length === 0 ? (
                <p className="text-sm text-neutral-500">ტვირთის სტრიქონები არ არის.</p>
              ) : (
                <ul className="space-y-2">
                  {item.cargo.map((row, idx) => (
                    <li key={row.id} className="rounded-lg border border-neutral-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-500">#{idx + 1}</span>
                        {isDraft && (
                          <button type="button" onClick={() => removeCargoRow(row.id)} className="text-neutral-400 hover:text-red-500">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          disabled={!isDraft}
                          defaultValue={row.name}
                          onBlur={(e) => { if (e.target.value !== row.name) patchCargoRow(row.id, { name: e.target.value }); }}
                          placeholder="ტვირთის დასახელება"
                        />
                        <Input
                          disabled={!isDraft}
                          type="number"
                          step="0.01"
                          defaultValue={row.total_weight_kg ?? ''}
                          onBlur={(e) => {
                            const v = e.target.value ? parseFloat(e.target.value) : null;
                            if (v !== row.total_weight_kg) patchCargoRow(row.id, { total_weight_kg: v });
                          }}
                          placeholder="საერთო წონა (კგ)"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {item.cargo.length > 0 && (
                <p className="mt-3 text-sm font-semibold text-neutral-700">
                  სულ: {cpTotalWeight(item.cargo).toLocaleString('ka-GE')} კგ
                </p>
              )}
            </CardContent>
          </Card>
          <WizardNav current={step} total={6} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {/* Step 3 — Checklist */}
      {step === 3 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">პლატფორმის შემოწმება</CardTitle></CardHeader>
            <CardContent>
              {(['A', 'B'] as const).map((section) => (
                <div key={section} className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {CP_SECTION_LABELS[section]}
                  </p>
                  <ul className="space-y-2">
                    {CP_ITEMS.filter((ci) => ci.section === section).map((ci) => {
                      const state = item.items.find((s) => s.id === ci.id);
                      const result = state?.result ?? null;
                      return (
                        <li key={ci.id} className="rounded-lg border border-neutral-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-neutral-800">{ci.label}</p>
                              <p className="text-xs text-neutral-500">{ci.description}</p>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              {(['good', 'fix', 'na'] as CPResult[]).map((r) => {
                                const active = result === r;
                                return (
                                  <button
                                    key={r}
                                    type="button"
                                    disabled={!isDraft}
                                    onClick={() => patchItem(ci.id, { result: active ? null : r })}
                                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition disabled:opacity-60 ${
                                      active ? RESULT_COLOR[r] : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
                                    }`}
                                  >
                                    {CP_RESULT_LABEL[r]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {result === 'fix' && isDraft && (
                            <Input
                              className="mt-2 text-xs"
                              disabled={!isDraft}
                              defaultValue={state?.comment ?? ''}
                              onBlur={(e) => {
                                const v = e.target.value || null;
                                if (v !== (state?.comment ?? null)) patchItem(ci.id, { comment: v });
                              }}
                              placeholder="შენიშვნა / გამოსასწ. აღწერა"
                            />
                          )}
                          {result === 'fix' && !isDraft && state?.comment && (
                            <p className="mt-1 text-xs text-amber-700">{state.comment}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
          <WizardNav current={step} total={6} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {/* Step 4 — Verdict / Conclusion */}
      {step === 4 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">დასკვნა</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ვერდიქტი</Label>
                <div className="flex flex-wrap gap-2">
                  {(['approved', 'conditional', 'rejected'] as CPVerdict[]).map((v) => {
                    const active = item.verdict === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={!isDraft}
                        onClick={() => save({ verdict: active ? null : v })}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                          active ? VERDICT_COLOR[v] : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
                        }`}
                      >
                        {v === 'approved' ? 'შეესაბამება' : v === 'conditional' ? 'პირობით' : 'არ შეესაბამება'}
                      </button>
                    );
                  })}
                </div>
                {item.verdict && (
                  <p className="text-xs text-neutral-500">{CP_VERDICT_LABEL[item.verdict]}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>კომენტარი / ღონისძიებები</Label>
                {isDraft ? (
                  <textarea
                    rows={3}
                    defaultValue={item.verdictComment}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== item.verdictComment) save({ verdictComment: v });
                    }}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    placeholder="გამოსასწ. ჩამონათვალი ან დასკვნის ტექსტი"
                  />
                ) : (
                  <p className="text-sm text-neutral-700">{item.verdictComment || '—'}</p>
                )}
              </div>

              {isDraft && (
                <Button
                  size="sm"
                  disabled={!canComplete || updateMutation.isPending}
                  onClick={() => save({ status: 'completed' })}
                >
                  დასრულება
                </Button>
              )}
            </CardContent>
          </Card>
          <WizardNav current={step} total={6} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {/* Step 5 — Signatures (display only — signing happens on mobile) */}
      {step === 5 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">ხელმოწერები</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {item.signatures.map((sig, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border border-neutral-200 p-4">
                  <p className="text-xs font-semibold text-neutral-500">
                    {idx === 0 ? 'ინსპექტორი' : 'ხელმომწერი 2'}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
                    <div><span className="text-neutral-500">სახელი:</span> {sig.name || '—'}</div>
                    <div><span className="text-neutral-500">პოზიცია:</span> {sig.position || '—'}</div>
                    <div><span className="text-neutral-500">ორგანიზაცია:</span> {sig.organization || '—'}</div>
                  </div>
                  {sig.signature ? (
                    <img
                      src={`data:image/png;base64,${sig.signature}`}
                      alt="ხელმოწერა"
                      className="h-16 rounded border border-neutral-200 bg-white object-contain p-1"
                    />
                  ) : (
                    <p className="text-xs text-neutral-400">ხელმოწერა — მობილური აპიდან</p>
                  )}
                  {sig.date && (
                    <p className="text-xs text-neutral-500">
                      {new Date(sig.date).toLocaleDateString('ka-GE')}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          <WizardNav current={step} total={6} onPrev={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} />
        </>
      )}

      {/* PDF overlay */}
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
            src={`#/cargo-platform/${item.id}/print?preview=1`}
            className="flex-1 w-full border-0 bg-white"
            title="PDF გადახედვა"
          />
        </div>
      )}
    </div>
  );
}

// Reusable inner component declared inside the module scope to avoid React hooks rules issues
function PillPair<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T | null;
  options: [T, string][];
  disabled: boolean;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        {options.map(([val, lbl]) => {
          const active = value === val;
          return (
            <button
              key={val}
              type="button"
              disabled={disabled}
              onClick={() => onChange(active ? null : val)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}
