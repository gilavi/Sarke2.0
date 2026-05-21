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
import { Link, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@mantine/core';
import DeleteButton from '@/components/DeleteButton';
import InspectionSignatures from '@/components/InspectionSignatures';
import SignatureCanvas from '@/components/SignatureCanvas';
import FieldInput from '@/components/FieldInput';
import WizardSteps, { WizardNav } from '@/components/WizardSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { ErrorView, EmptyView } from '@/components/async/AsyncBoundary';
import { routes } from '@/app/routes';
import { bobcatKeys } from '@/app/queryKeys';
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
import { CompletedBanner } from './components/CompletedBanner';
import { InspectionPdfOverlay } from './components/InspectionPdfOverlay';
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
            <Link to={routes.inspections.list(effectiveItem.projectId)} className="text-brand-600 hover:underline">
              აქტები
            </Link>
            <span className="text-neutral-400">›</span>
            <span className="truncate max-w-[200px] text-neutral-500">
              {effectiveItem.equipmentModel || effectiveItem.company || 'ციცხვიანი დამტვირთველი'}
            </span>
          </nav>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
            {effectiveItem.equipmentModel || effectiveItem.company || 'ციცხვიანი დამტვირთველის აქტი'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            სტატუსი: {effectiveItem.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!d.isPending && (
            <Button variant="outline" size="sm" onClick={() => d.setPdfOpen(true)}>
              <FileText size={14} className="mr-1" />
              PDF
            </Button>
          )}
          {!d.isPending && <DeleteButton onDelete={d.del} isPending={d.deleting} />}
        </div>
      </header>

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

      <WizardSteps
        steps={[{ label: 'ინფო' }, { label: 'შემოწმება' }, { label: 'დასკვნა' }]}
        current={d.step}
        onStep={d.setStep}
      />

      {d.step === 0 && (
        <>
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
          <WizardNav current={d.step} total={3} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.step === 1 && (
        <>
          {Object.entries(grouped).map(([cat, entries]) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle className="text-base">{CATEGORY_LABEL[cat] ?? cat}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-neutral-200">
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
                </ul>
              </CardContent>
            </Card>
          ))}
          <WizardNav current={d.step} total={3} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.step === 2 && (
        <>
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
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(VERDICT_LABEL) as BobcatVerdict[]).map((v) => {
                        const selected = effectiveItem.verdict === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => d.save({ verdict: selected ? null : v })}
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
                  <Textarea
                    label="შენიშვნები"
                    rows={3}
                    defaultValue={effectiveItem.notes ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value || null;
                      if (v !== effectiveItem.notes) d.save({ notes: v });
                    }}
                    radius="md"
                    autosize={false}
                  />
                  <Button size="sm" onClick={() => d.save({ status: 'completed' })} disabled={d.updating || d.isPending}>
                    დასრულება
                  </Button>
                </>
              ) : (
                <div className="space-y-1 text-sm text-neutral-700">
                  <div>დასკვნა: {effectiveItem.verdict ? VERDICT_LABEL[effectiveItem.verdict] : '—'}</div>
                  <div>შენიშვნები: {effectiveItem.notes || '—'}</div>
                </div>
              )}
            </CardContent>
          </Card>
          <WizardNav current={d.step} total={3} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.pdfOpen && (
        <InspectionPdfOverlay
          src={`#${routes.bobcat.print(effectiveItem.id)}?preview=1`}
          onClose={() => d.setPdfOpen(false)}
        />
      )}
    </div>
  );
}
