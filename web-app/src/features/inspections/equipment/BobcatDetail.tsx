/**
 * Bobcat / large-loader inspection detail.
 *
 * Built on the shared equipment engine: the draft/query/mutation lifecycle comes
 * from useEquipmentDetail, and the completed banner, checklist rows, result
 * pills, and PDF overlay come from the shared widgets. Only bobcat-specific
 * config (catalog selection, result/verdict labels, category grouping) lives
 * here.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import DeleteButton from '@/components/DeleteButton';
import InspectionSignatures from '@/components/InspectionSignatures';
import SignatureCanvas from '@/components/SignatureCanvas';
import FieldInput from '@/components/FieldInput';
import { WizardFrame, SegmentedControl } from '@/components/wizard';
import SuccessModal, { type SuccessModalData } from '@/components/web/SuccessModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { ErrorView, EmptyView } from '@/components/async/AsyncBoundary';
import { routes } from '@/app/routes';
import { bobcatKeys } from '@/app/queryKeys';
import { equipmentInspectionName } from '@/lib/documentNames';
import { VERDICT_GOOD, VERDICT_WARN, VERDICT_BAD } from '@/lib/verdictColors';
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
  type BobcatPatch,
  type BobcatVerdict,
  type CreateBobcatArgs,
} from '@/lib/data/bobcat';
import { useEquipmentDetail } from './useEquipmentDetail';
import { ChecklistItemRow } from './components/ChecklistItemRow';
import type { ResultOption } from './components/ResultPills';

const RESULT_OPTIONS: ResultOption<BobcatItemResult>[] = [
  { value: 'good', label: 'ნორმაში', tone: 'good' },
  { value: 'deficient', label: 'ხარვეზია', tone: 'warn' },
  { value: 'unusable', label: 'გამოუსადეგ.', tone: 'bad' },
];

const VERDICT_LABEL: Record<BobcatVerdict, string> = {
  approved: 'დაშვებულია',
  limited: 'პირობით',
  rejected: 'არ დაიშვება',
};

const VERDICT_BG: Record<BobcatVerdict, string> = {
  approved: VERDICT_GOOD,
  limited: VERDICT_WARN,
  rejected: VERDICT_BAD,
};

const STEP_LABELS = ['ინფო', 'შემოწმება', 'დასკვნა'];

const CATEGORY_LABEL: Record<string, string> = {
  A: 'A — თვლები და სამუხრუჭე სისტემა',
  B: 'B — ციცხვი, მკლავი და ჰიდრავლიკა',
  C: 'C — ძრავი',
  D: 'D — კაბინა, მართვა, უსაფრთხოება',
};

function catalogFor(templateId: string | null): BobcatChecklistEntry[] {
  return templateId === BOBCAT_TEMPLATE_ID ? BOBCAT_ITEMS : LARGE_LOADER_ITEMS;
}

/** Per-row result options, applying an entry's custom "unusable" label. */
function optionsFor(entry: BobcatChecklistEntry): ResultOption<BobcatItemResult>[] {
  if (!entry.unusableLabel) return RESULT_OPTIONS;
  return RESULT_OPTIONS.map((o) =>
    o.value === 'unusable' ? { ...o, label: entry.unusableLabel as string } : o,
  );
}

export default function BobcatDetail() {
  const navigate = useNavigate();
  const d = useEquipmentDetail<BobcatInspection, BobcatPatch, CreateBobcatArgs>({
    get: getBobcatInspection,
    update: updateBobcatInspection,
    remove: deleteBobcatInspection,
    detailKey: bobcatKeys.detail,
    listKey: bobcatKeys.lists,
    getProjectId: (i) => i.projectId,
  });

  const [signingOpen, setSigningOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  if (d.isLoading) return <SkeletonDetailPage />;
  if (d.isError) return <ErrorView error={d.error} />;
  if (!d.item && !d.isPending) return <EmptyView message="აქტი ვერ მოიძებნა." />;

  const effectiveItem: BobcatInspection = d.item ?? {
    id: 'draft',
    projectId: d.pendingCreate?.projectId ?? '',
    templateId: d.pendingCreate?.templateId ?? BOBCAT_TEMPLATE_ID,
    userId: '',
    status: 'draft',
    company: d.pendingCreate?.company ?? null,
    address: null,
    equipmentModel: d.pendingCreate?.equipmentModel ?? null,
    registrationNumber: d.pendingCreate?.registrationNumber ?? null,
    department: d.pendingCreate?.department ?? null,
    inspectorName: d.pendingCreate?.inspectorName ?? null,
    inspectionDate: d.pendingCreate?.inspectionDate ?? new Date().toISOString().slice(0, 10),
    inspectionType: (d.pendingCreate?.inspectionType ?? 'pre_work') as BobcatInspectionType,
    items: [],
    verdict: null,
    notes: null,
    inspectorSignature: null,
    signatories: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  const isDraft = effectiveItem.status === 'draft';
  const catalog = catalogFor(effectiveItem.templateId);
  const itemsById = new Map<number, BobcatItemState>(effectiveItem.items.map((i) => [i.id, i]));

  const grouped = catalog.reduce<Record<string, BobcatChecklistEntry[]>>((acc, entry) => {
    (acc[entry.category] ??= []).push(entry);
    return acc;
  }, {});

  async function patchItem(itemId: number, patch: Partial<BobcatItemState>) {
    if (d.isPending && d.pendingCreate) {
      try {
        const realId = await d.lazyCreate(createBobcatInspection);
        if (!realId) return;
        const templateId = d.pendingCreate.templateId ?? BOBCAT_TEMPLATE_ID;
        const initialItems: BobcatItemState[] = catalogFor(templateId).map((e) => ({
          id: e.id,
          result: null,
          comment: null,
          photo_paths: [],
        }));
        const patched = initialItems.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
        await updateBobcatInspection(realId, { items: patched });
        d.qc.invalidateQueries({ queryKey: bobcatKeys.lists() });
        navigate(routes.bobcat.detail(realId), { replace: true, state: {} });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (!d.item) return;
    const items = d.item.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
    d.save({ items });
  }

  const total = STEP_LABELS.length;
  const isConclusion = d.step === total - 1;

  const evaluated = (effectiveItem.items ?? []).filter((i) => i.result !== null);
  const goodCount = evaluated.filter((i) => i.result === 'good').length;
  const successData: SuccessModalData = {
    totalCount: evaluated.length,
    safeCount: goodCount,
    problemCount: evaluated.length - goodCount,
    inspectionName: equipmentInspectionName('bobcat'),
    projectName: d.project?.name ?? '',
    itemLabel: 'პუნქტი',
  };

  function handleNext() {
    if (!isConclusion) { d.goStep(d.step + 1); return; }
    if (isDraft) {
      d.save({ status: 'completed' });
      setSuccessOpen(true);
    } else {
      window.open(`#${routes.bobcat.print(effectiveItem.id)}`, '_blank');
    }
  }

  return (
    <>
      <WizardFrame
        open
        onClose={() => navigate(routes.inspections.list())}
        projectName={d.project?.name}
        inspectionName={equipmentInspectionName('bobcat')}
        stepName={`${STEP_LABELS[d.step]} · ${d.step + 1}/${total}`}
        showProgress
        progressPercent={(d.step / (total - 1)) * 100}
        closeDisabled={d.updating}
        stepKey={d.step}
        direction={d.direction}
        onBack={() => d.goStep(d.step - 1)}
        onNext={handleNext}
        backDisabled={d.step === 0 || d.updating}
        nextDisabled={isConclusion && isDraft ? !effectiveItem.verdict || d.updating || d.isPending : false}
        nextLabel={isConclusion ? (isDraft ? 'დასრულება' : 'PDF გენერირება') : 'შემდეგი'}
        hideNextArrow={isConclusion}
        submitting={isConclusion && isDraft && d.updating}
      >
        {d.step === 0 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <FieldInput label="კომპანია" value={effectiveItem.company} disabled={!isDraft} onSave={(v) => d.save({ company: v })} />
                <FieldInput label="მოდელი" value={effectiveItem.equipmentModel} disabled={!isDraft} onSave={(v) => d.save({ equipmentModel: v })} />
                <FieldInput label="სარეგ. ნომერი" value={effectiveItem.registrationNumber} disabled={!isDraft} onSave={(v) => d.save({ registrationNumber: v })} />
                <FieldInput label="დეპარტამენტი" value={effectiveItem.department} disabled={!isDraft} onSave={(v) => d.save({ department: v })} />
                <FieldInput label="ინსპექტორი" value={effectiveItem.inspectorName} disabled={!isDraft} onSave={(v) => d.save({ inspectorName: v })} />
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
            {Object.entries(grouped).map(([cat, entries]) => (
              <Card key={cat}>
                <CardHeader>
                  <CardTitle className="text-base">{CATEGORY_LABEL[cat] ?? cat}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {entries.map((entry) => {
                    const state =
                      itemsById.get(entry.id) ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
                    return (
                      <ChecklistItemRow
                        key={entry.id}
                        entryId={entry.id}
                        label={entry.label}
                        description={entry.description}
                        options={optionsFor(entry)}
                        result={state.result}
                        comment={state.comment}
                        photoPaths={state.photo_paths ?? []}
                        disabled={!isDraft}
                        photoPrefix="bobcat"
                        inspectionId={effectiveItem.id}
                        onResult={(r) => patchItem(entry.id, { result: r })}
                        onComment={(c) => patchItem(entry.id, { comment: c })}
                        onAddPhoto={(path) =>
                          patchItem(entry.id, { photo_paths: [...(state.photo_paths ?? []), path] })
                        }
                        onRemovePhoto={(path) =>
                          patchItem(entry.id, {
                            photo_paths: (state.photo_paths ?? []).filter((p) => p !== path),
                          })
                        }
                      />
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {d.step === 2 && (
          <div className="space-y-4">
            {!d.isPending && (
              <InspectionSignatures
                inspection={{
                  inspector_signature: effectiveItem.inspectorSignature ?? null,
                  inspector_name: effectiveItem.inspectorName ?? null,
                  signatories: effectiveItem.signatories ?? [],
                  created_at: effectiveItem.createdAt,
                  completed_at: effectiveItem.completedAt ?? null,
                }}
                canEdit={effectiveItem.status === 'completed'}
                onUpdate={(sigs) => d.save({ signatories: sigs })}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">ინსპექტორის ხელმოწერა</CardTitle>
              </CardHeader>
              <CardContent>
                {signingOpen && isDraft ? (
                  <SignatureCanvas
                    existing={
                      effectiveItem.inspectorSignature
                        ? effectiveItem.inspectorSignature.startsWith('data:')
                          ? effectiveItem.inspectorSignature
                          : `data:image/png;base64,${effectiveItem.inspectorSignature}`
                        : undefined
                    }
                    onSave={(dataUrl) => {
                      d.save({ inspectorSignature: dataUrl });
                      setSigningOpen(false);
                    }}
                    onCancel={() => setSigningOpen(false)}
                  />
                ) : effectiveItem.inspectorSignature ? (
                  <div className="space-y-2">
                    <img
                      src={
                        effectiveItem.inspectorSignature.startsWith('data:')
                          ? effectiveItem.inspectorSignature
                          : `data:image/png;base64,${effectiveItem.inspectorSignature}`
                      }
                      alt="ხელმოწერა"
                      className="h-20 rounded border border-neutral-200 bg-white object-contain p-1"
                    />
                    {isDraft && (
                      <Button variant="outline" size="sm" onClick={() => setSigningOpen(true)}>
                        განახლება
                      </Button>
                    )}
                  </div>
                ) : isDraft ? (
                  <Button variant="outline" size="sm" onClick={() => setSigningOpen(true)}>
                    ხელმოწერა
                  </Button>
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
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">დასკვნა</p>
                      <SegmentedControl
                        fullWidth
                        options={(Object.keys(VERDICT_LABEL) as BobcatVerdict[]).map((v) => ({
                          label: VERDICT_LABEL[v],
                          value: v,
                          selectedBg: VERDICT_BG[v],
                        }))}
                        selected={effectiveItem.verdict}
                        onSelect={(v) =>
                          d.save({ verdict: v === effectiveItem.verdict ? null : (v as BobcatVerdict) })
                        }
                      />
                    </div>
                    <Textarea
                      label="შენიშვნები"
                      rows={3}
                      defaultValue={effectiveItem.notes ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== effectiveItem.notes) d.save({ notes: v });
                      }}
                    />
                  </>
                ) : (
                  <div className="space-y-1 text-sm text-neutral-700">
                    <div>დასკვნა: {effectiveItem.verdict ? VERDICT_LABEL[effectiveItem.verdict] : '—'}</div>
                    <div>შენიშვნები: {effectiveItem.notes || '—'}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </WizardFrame>

      <SuccessModal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        onGeneratePDF={() => window.open(`#${routes.bobcat.print(effectiveItem.id)}`, '_blank')}
        data={successData}
      />
    </>
  );
}
