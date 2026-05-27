/**
 * Cargo-platform inspection detail.
 *
 * Built on the shared equipment engine (useEquipmentDetail) for the
 * query/mutation/delete/PDF lifecycle. Cargo-platform is the divergent member of
 * the family: six steps, an add/remove cargo table, conditional per-item
 * comments (no photos), and signing that happens on mobile — so the desktop view
 * is signature-display-only and keeps its own result/verdict color language.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { NumberInput } from '@mantine/core';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DeleteButton from '@/components/DeleteButton';
import InspectionSignatures from '@/components/InspectionSignatures';
import FieldInput from '@/components/FieldInput';
import { WizardFrame, SegmentedControl } from '@/components/wizard';
import SuccessModal, { type SuccessModalData } from '@/components/web/SuccessModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { ErrorView, EmptyView } from '@/components/async/AsyncBoundary';
import { routes } from '@/app/routes';
import { cargoPlatformKeys } from '@/app/queryKeys';
import { equipmentInspectionName } from '@/lib/documentNames';
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
import { VERDICT_GOOD, VERDICT_WARN, VERDICT_BAD, VERDICT_NEUTRAL } from '@/lib/verdictColors';

const VERDICT_BG: Record<CPVerdict, string> = {
  approved: VERDICT_GOOD,
  conditional: VERDICT_WARN,
  rejected: VERDICT_BAD,
};

const RESULT_BG: Record<CPResult, string> = {
  good: VERDICT_GOOD,
  fix: VERDICT_WARN,
  na: VERDICT_NEUTRAL,
};

const STEP_LABELS = ['ინფო', 'პლატფ.', 'ტვირთი', 'შემოწმება', 'დასკვნა', 'ხელმოწ.'];

export default function CargoPlatformDetail() {
  const navigate = useNavigate();
  const d = useEquipmentDetail<CargoPlatformInspection, CargoPlatformPatch, CreateCargoPlatformArgs>({
    get: getCargoPlatformInspection,
    update: updateCargoPlatformInspection,
    remove: deleteCargoPlatformInspection,
    detailKey: cargoPlatformKeys.detail,
    listKey: cargoPlatformKeys.lists,
    getProjectId: (i) => i.projectId,
  });
  const [successOpen, setSuccessOpen] = useState(false);

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
  const total = STEP_LABELS.length;
  const isLast = d.step === total - 1;

  const evaluated = item.items.filter((i) => i.result !== null);
  const goodCount = evaluated.filter((i) => i.result === 'good').length;
  const successData: SuccessModalData = {
    totalCount: evaluated.length,
    safeCount: goodCount,
    problemCount: evaluated.filter((i) => i.result === 'fix').length,
    inspectionName: equipmentInspectionName('cargo_platform'),
    projectName: d.project?.name ?? '',
    itemLabel: 'პუნქტი',
  };

  function handleNext() {
    if (!isLast) { d.goStep(d.step + 1); return; }
    if (isDraft) {
      if (canComplete) { save({ status: 'completed' }); setSuccessOpen(true); }
    } else {
      window.open(`#${routes.cargoPlatform.print(item.id)}`, '_blank');
    }
  }

  return (
    <>
      <WizardFrame
        open
        onClose={() => navigate(routes.inspections.list())}
        projectName={d.project?.name}
        inspectionName={equipmentInspectionName('cargo_platform')}
        stepName={`${STEP_LABELS[d.step]} · ${d.step + 1}/${total}`}
        showProgress
        progressPercent={(d.step / (total - 1)) * 100}
        closeDisabled={d.updating}
        stepKey={d.step}
        direction={d.direction}
        onBack={() => d.goStep(d.step - 1)}
        onNext={handleNext}
        backDisabled={d.step === 0 || d.updating}
        nextDisabled={isLast && isDraft ? !canComplete || d.updating : false}
        nextLabel={isLast ? (isDraft ? 'დასრულება' : 'PDF გენერირება') : 'შემდეგი'}
        hideNextArrow={isLast}
        submitting={isLast && isDraft && d.updating}
      >
      {d.step === 0 && (
        <div className="space-y-4">
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
              <Input
                label="შემოწმების თარიღი"
                type="date"
                disabled={!isDraft}
                defaultValue={item.inspectionDate ? item.inspectionDate.slice(0, 10) : ''}
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== (item.inspectionDate ? item.inspectionDate.slice(0, 10) : null))
                    save({ inspectionDate: v });
                }}
              />
            </CardContent>
          </Card>
          {!d.isPending && (
            <div className="flex justify-end">
              <DeleteButton onDelete={d.del} isPending={d.deleting} />
            </div>
          )}
        </div>
      )}

      {d.step === 1 && (
        <div className="space-y-4">
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
        </div>
      )}

      {d.step === 2 && (
        <div className="space-y-4">
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
                        <NumberInput
                          disabled={!isDraft}
                          step={0.01}
                          defaultValue={row.total_weight_kg ?? ''}
                          onBlur={(e) => {
                            const v = e.target.value ? parseFloat(e.target.value) : null;
                            if (v !== row.total_weight_kg) patchCargoRow(row.id, { total_weight_kg: v });
                          }}
                          placeholder="საერთო წონა (კგ)"
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
        </div>
      )}

      {d.step === 3 && (
        <div className="space-y-4">
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
                            <div className="shrink-0" style={{ width: 180 }}>
                              <SegmentedControl
                                fullWidth
                                options={(['good', 'fix', 'na'] as CPResult[]).map((r) => ({
                                  label: CP_RESULT_LABEL[r],
                                  value: r,
                                  selectedBg: RESULT_BG[r],
                                }))}
                                selected={result}
                                onSelect={(r) => { if (isDraft) patchItem(ci.id, { result: r === result ? null : (r as CPResult) }); }}
                              />
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
        </div>
      )}

      {d.step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">დასკვნა</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ვერდიქტი</p>
                {isDraft ? (
                  <SegmentedControl
                    fullWidth
                    options={(['approved', 'conditional', 'rejected'] as CPVerdict[]).map((v) => ({
                      label: v === 'approved' ? 'შეესაბამება' : v === 'conditional' ? 'პირობით' : 'არ შეესაბამება',
                      value: v,
                      selectedBg: VERDICT_BG[v],
                    }))}
                    selected={item.verdict}
                    onSelect={(v) => save({ verdict: v === item.verdict ? null : (v as CPVerdict) })}
                  />
                ) : (
                  <p className="text-sm text-neutral-700">
                    {item.verdict
                      ? item.verdict === 'approved'
                        ? 'შეესაბამება'
                        : item.verdict === 'conditional'
                          ? 'პირობით'
                          : 'არ შეესაბამება'
                      : '—'}
                  </p>
                )}
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
                  />
                ) : (
                  <p className="text-sm text-neutral-700">{item.verdictComment || '—'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {d.step === 5 && (
        <div className="space-y-4">
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
        </div>
      )}
      </WizardFrame>

      <SuccessModal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        onGeneratePDF={() => window.open(`#${routes.cargoPlatform.print(item.id)}`, '_blank')}
        data={successData}
      />
    </>
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
      <SegmentedControl
        fullWidth
        options={options.map(([val, lbl]) => ({ label: lbl, value: val, selectedBg: VERDICT_GOOD }))}
        selected={value}
        onSelect={(v) => { if (!disabled) onChange(v === value ? null : (v as T)); }}
      />
    </div>
  );
}
