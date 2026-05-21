/**
 * Cargo-platform inspection detail.
 *
 * Built on the shared equipment engine (useEquipmentDetail) for the
 * query/mutation/delete/PDF lifecycle. Cargo-platform is the divergent member of
 * the family: six steps, an add/remove cargo table, conditional per-item
 * comments (no photos), and signing that happens on mobile — so the desktop view
 * is signature-display-only and keeps its own result/verdict color language.
 */
import { Link } from 'react-router-dom';
import { FileText, Plus, X } from 'lucide-react';
import { NumberInput, Textarea, TextInput } from '@mantine/core';
import DeleteButton from '@/components/DeleteButton';
import InspectionSignatures from '@/components/InspectionSignatures';
import FieldInput from '@/components/FieldInput';
import WizardSteps, { WizardNav } from '@/components/WizardSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { ErrorView, EmptyView } from '@/components/async/AsyncBoundary';
import { routes } from '@/app/routes';
import { cargoPlatformKeys } from '@/app/queryKeys';
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
  type CargoPlatformInspection,
  type CargoPlatformPatch,
  type CreateCargoPlatformArgs,
  type CPVerdict,
  type CPResult,
  type CPCargoRow,
  type CPItemState,
} from '@/lib/data/cargoPlatform';
import { useEquipmentDetail } from './useEquipmentDetail';
import { CompletedBanner } from './components/CompletedBanner';
import { InspectionPdfOverlay } from './components/InspectionPdfOverlay';

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

export default function CargoPlatformDetail() {
  const d = useEquipmentDetail<CargoPlatformInspection, CargoPlatformPatch, CreateCargoPlatformArgs>({
    get: getCargoPlatformInspection,
    update: updateCargoPlatformInspection,
    remove: deleteCargoPlatformInspection,
    detailKey: cargoPlatformKeys.detail,
    listKey: cargoPlatformKeys.lists,
    getProjectId: (i) => i.projectId,
  });

  if (d.isLoading) return <SkeletonDetailPage />;
  if (d.isError) return <ErrorView error={d.error} />;
  if (!d.item) return <EmptyView message="აქტი ვერ მოიძებნა." />;

  const item = d.item;
  const isDraft = item.status === 'draft';
  const save = d.save;

  function addCargoRow() {
    save({ cargo: [...item.cargo, newCargoRow()] });
  }

  function removeCargoRow(rowId: string) {
    save({ cargo: item.cargo.filter((r) => r.id !== rowId) });
  }

  function patchCargoRow(rowId: string, patch: Partial<CPCargoRow>) {
    save({ cargo: item.cargo.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) });
  }

  function patchItem(itemId: number, patch: Partial<CPItemState>) {
    save({ items: item.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) });
  }

  const canComplete = isDraft && !!item.verdict;

  return (
    <div className="space-y-6">
      {d.justCompleted && <CompletedBanner onViewPdf={() => d.setPdfOpen(true)} />}

      <header className="flex items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-sm">
            {d.project && (
              <>
                <Link to={routes.projects.detail(d.project.id)} className="text-brand-600 hover:underline">
                  {d.project.name}
                </Link>
                <span className="text-neutral-400">›</span>
              </>
            )}
            <Link to={routes.inspections.list(item.projectId)} className="text-brand-600 hover:underline">
              აქტები
            </Link>
            <span className="text-neutral-400">›</span>
            <span className="truncate max-w-[200px] text-neutral-500">
              {item.company || 'პლატფორმა'}
            </span>
          </nav>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
            {item.company || `პლატფ. #${item.id.slice(0, 8)}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            სტატუსი: {item.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => d.setPdfOpen(true)}>
            <FileText size={14} className="mr-1" />
            PDF
          </Button>
          <DeleteButton onDelete={d.del} isPending={d.deleting} />
        </div>
      </header>

      <InspectionSignatures
        inspection={{
          inspector_name: item.inspectorName || null,
          signatories: item.signatories ?? [],
          created_at: item.createdAt,
          completed_at: item.completedAt ?? null,
        }}
        canEdit={item.status === 'completed'}
        onUpdate={(sigs) => save({ signatories: sigs })}
      />

      <WizardSteps
        steps={[
          { label: 'ინფო' },
          { label: 'პლატფ.' },
          { label: 'ტვირთი' },
          { label: 'შემოწმება' },
          { label: 'დასკვნა' },
          { label: 'ხელმოწ.' },
        ]}
        current={d.step}
        onStep={d.setStep}
      />

      {d.step === 0 && (
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
              <TextInput
                label="შემოწმების თარიღი"
                type="date"
                disabled={!isDraft}
                defaultValue={item.inspectionDate ? item.inspectionDate.slice(0, 10) : ''}
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== (item.inspectionDate ? item.inspectionDate.slice(0, 10) : null))
                    save({ inspectionDate: v });
                }}
                radius="md"
              />
            </CardContent>
          </Card>
          <WizardNav current={d.step} total={6} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.step === 1 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">პლატფორმის იდენტიფიკაცია</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldInput label="ტიპი / მოდელი" value={item.platformTypeModel || null} disabled={!isDraft}
                  onSave={(v) => save({ platformTypeModel: v })} />
              </div>
              <NumberInput
                label="სიგრძე (მ)"
                step={0.01}
                disabled={!isDraft}
                defaultValue={item.platformLength ?? ''}
                onBlur={(e) => {
                  const v = e.target.value ? parseFloat(e.target.value) : null;
                  if (v !== item.platformLength) save({ platformLength: v });
                }}
                radius="md"
                hideControls
              />
              <NumberInput
                label="სიგანე (მ)"
                step={0.01}
                disabled={!isDraft}
                defaultValue={item.platformWidth ?? ''}
                onBlur={(e) => {
                  const v = e.target.value ? parseFloat(e.target.value) : null;
                  if (v !== item.platformWidth) save({ platformWidth: v });
                }}
                radius="md"
                hideControls
              />
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
          <WizardNav current={d.step} total={6} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.step === 2 && (
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
                        <TextInput
                          disabled={!isDraft}
                          defaultValue={row.name}
                          onBlur={(e) => { if (e.target.value !== row.name) patchCargoRow(row.id, { name: e.target.value }); }}
                          placeholder="ტვირთის დასახელება"
                          radius="md"
                        />
                        <NumberInput
                          disabled={!isDraft}
                          step={0.01}
                          defaultValue={row.total_weight_kg ?? ''}
                          onBlur={(e) => {
                            const v = e.target.value ? parseFloat(e.target.value) : null;
                            if (v !== row.total_weight_kg) patchCargoRow(row.id, { total_weight_kg: v });
                          }}
                          placeholder="საერთო წონა (კგ)"
                          radius="md"
                          hideControls
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
          <WizardNav current={d.step} total={6} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.step === 3 && (
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
                            <TextInput
                              classNames={{ input: 'mt-2 text-xs' }}
                              disabled={!isDraft}
                              defaultValue={state?.comment ?? ''}
                              onBlur={(e) => {
                                const v = e.target.value || null;
                                if (v !== (state?.comment ?? null)) patchItem(ci.id, { comment: v });
                              }}
                              placeholder="შენიშვნა / გამოსასწ. აღწერა"
                              radius="md"
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
          <WizardNav current={d.step} total={6} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.step === 4 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">დასკვნა</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ვერდიქტი</p>
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
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">კომენტარი / ღონისძიებები</p>
                {isDraft ? (
                  <Textarea
                    rows={3}
                    defaultValue={item.verdictComment}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== item.verdictComment) save({ verdictComment: v });
                    }}
                    placeholder="გამოსასწ. ჩამონათვალი ან დასკვნის ტექსტი"
                    radius="md"
                    autosize={false}
                  />
                ) : (
                  <p className="text-sm text-neutral-700">{item.verdictComment || '—'}</p>
                )}
              </div>

              {isDraft && (
                <Button
                  size="sm"
                  disabled={!canComplete || d.updating}
                  onClick={() => save({ status: 'completed' })}
                >
                  დასრულება
                </Button>
              )}
            </CardContent>
          </Card>
          <WizardNav current={d.step} total={6} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.step === 5 && (
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
          <WizardNav current={d.step} total={6} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.pdfOpen && (
        <InspectionPdfOverlay
          src={`#${routes.cargoPlatform.print(item.id)}?preview=1`}
          onClose={() => d.setPdfOpen(false)}
        />
      )}
    </div>
  );
}

// Reusable inner component declared in module scope to avoid React hooks rules issues
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
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</p>
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
