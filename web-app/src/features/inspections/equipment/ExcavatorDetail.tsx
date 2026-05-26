/**
 * Excavator inspection detail.
 *
 * Built on the shared equipment engine (useEquipmentDetail + shared widgets).
 * Excavator-specific: a read-only machine-specs grid, dated general-info fields,
 * four checklist sections (each its own column) plus a yes/no+date maintenance
 * section, and the approval verdict.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { NumberInput } from '@mantine/core';
import { Input } from '@/components/ui/input';
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
import { excavatorKeys } from '@/app/queryKeys';
import { equipmentInspectionName } from '@/lib/documentNames';
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
  type CreateExcavatorArgs,
  type ExcavatorChecklistEntry,
  type ExcavatorChecklistItemState,
  type ExcavatorChecklistResult,
  type ExcavatorInspection,
  type ExcavatorMaintenanceItemState,
  type ExcavatorPatch,
  type ExcavatorVerdict,
} from '@/lib/data/excavator';
import { useEquipmentDetail } from './useEquipmentDetail';
import { ChecklistItemRow } from './components/ChecklistItemRow';
import type { ResultOption } from './components/ResultPills';

type ExcavatorResult = Exclude<ExcavatorChecklistResult, null>;

const RESULT_OPTIONS: ResultOption<ExcavatorResult>[] = [
  { value: 'good', label: 'ნორმაში', tone: 'good' },
  { value: 'deficient', label: 'ხარვეზი', tone: 'warn' },
  { value: 'unusable', label: 'გამოუსადეგ.', tone: 'bad' },
];

const VERDICT_BG = ['#1D9E75', '#D97706', '#EF4444', '#94A3B8'];
const STEP_LABELS = ['ინფო', 'შემოწმება', 'დასკვნა'];

interface SectionDef {
  key: 'engine' | 'undercarriage' | 'cabin' | 'safety';
  title: string;
  items: ExcavatorChecklistEntry[];
  field: 'engineItems' | 'undercarriageItems' | 'cabinItems' | 'safetyItems';
}

const SECTIONS: SectionDef[] = [
  { key: 'engine', title: 'ძრავი', items: ENGINE_ITEMS, field: 'engineItems' },
  { key: 'undercarriage', title: 'ხოდოვაი / მკლავი', items: UNDERCARRIAGE_ITEMS, field: 'undercarriageItems' },
  { key: 'cabin', title: 'კაბინა', items: CABIN_ITEMS, field: 'cabinItems' },
  { key: 'safety', title: 'უსაფრთხოება', items: SAFETY_ITEMS, field: 'safetyItems' },
];

const EMPTY_SPECS = { weight: '—', engine: '—', power: '—', depth: '—', travel: '—', maxReach: '—' };

export default function ExcavatorDetail() {
  const navigate = useNavigate();
  const d = useEquipmentDetail<ExcavatorInspection, ExcavatorPatch, CreateExcavatorArgs>({
    get: getExcavatorInspection,
    update: updateExcavatorInspection,
    remove: deleteExcavatorInspection,
    detailKey: excavatorKeys.detail,
    listKey: excavatorKeys.lists,
    getProjectId: (i) => i.projectId,
  });

  const [signingOpen, setSigningOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  if (d.isLoading) return <SkeletonDetailPage />;
  if (d.isError) return <ErrorView error={d.error} />;
  if (!d.item && !d.isPending) return <EmptyView message="აქტი ვერ მოიძებნა." />;

  const effectiveItem: ExcavatorInspection = d.item ?? {
    id: 'draft',
    status: 'draft',
    projectId: d.pendingCreate?.projectId ?? '',
    templateId: '',
    userId: '',
    serialNumber: d.pendingCreate?.serialNumber ?? null,
    registrationNumber: null,
    inventoryNumber: d.pendingCreate?.inventoryNumber ?? null,
    projectName: null,
    department: d.pendingCreate?.department ?? null,
    inspectorName: d.pendingCreate?.inspectorName ?? null,
    inspectorPosition: null,
    inspectionDate: d.pendingCreate?.inspectionDate ?? new Date().toISOString().slice(0, 10),
    lastInspectionDate: null,
    motoHours: null,
    machineSpecs: EMPTY_SPECS,
    engineItems: [],
    undercarriageItems: [],
    cabinItems: [],
    safetyItems: [],
    maintenanceItems: [],
    inspectorSignature: null,
    signatories: [],
    verdict: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  const isDraft = effectiveItem.status === 'draft';

  async function patchSection(field: SectionDef['field'], itemId: number, patch: Partial<ExcavatorChecklistItemState>) {
    if (d.isPending && d.pendingCreate) {
      try {
        const realId = await d.lazyCreate(createExcavatorInspection);
        if (!realId) return;
        const sectionDef = SECTIONS.find((s) => s.field === field)!;
        const initial: ExcavatorChecklistItemState[] = sectionDef.items.map((e) => ({
          id: e.id, result: null, comment: null, photo_paths: [],
        }));
        const patched = initial.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
        await updateExcavatorInspection(realId, { [field]: patched } as ExcavatorPatch);
        d.qc.invalidateQueries({ queryKey: excavatorKeys.lists() });
        navigate(routes.excavator.detail(realId), { replace: true, state: {} });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (!d.item) return;
    const list = d.item[field] as ExcavatorChecklistItemState[];
    const next = list.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
    d.save({ [field]: next } as ExcavatorPatch);
  }

  async function patchMaintenance(itemId: number, patch: Partial<ExcavatorMaintenanceItemState>) {
    if (d.isPending && d.pendingCreate) {
      try {
        const realId = await d.lazyCreate(createExcavatorInspection);
        if (!realId) return;
        const initial = MAINTENANCE_ITEMS.map((m) => ({ id: m.id, answer: null as null, date: null as null }));
        const next = initial.map((m) => (m.id === itemId ? { ...m, ...patch } : m));
        await updateExcavatorInspection(realId, { maintenanceItems: next });
        d.qc.invalidateQueries({ queryKey: excavatorKeys.lists() });
        navigate(routes.excavator.detail(realId), { replace: true, state: {} });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (!d.item) return;
    const next = d.item.maintenanceItems.map((m) => (m.id === itemId ? { ...m, ...patch } : m));
    d.save({ maintenanceItems: next });
  }

  const total = STEP_LABELS.length;
  const isConclusion = d.step === total - 1;

  const allItems = [
    ...effectiveItem.engineItems,
    ...effectiveItem.undercarriageItems,
    ...effectiveItem.cabinItems,
    ...effectiveItem.safetyItems,
  ];
  const evaluated = allItems.filter((i) => i.result !== null);
  const goodCount = evaluated.filter((i) => i.result === 'good').length;
  const successData: SuccessModalData = {
    totalCount: evaluated.length,
    safeCount: goodCount,
    problemCount: evaluated.length - goodCount,
    inspectionName: equipmentInspectionName('excavator'),
    projectName: d.project?.name ?? '',
    itemLabel: 'პუნქტი',
  };

  function handleNext() {
    if (!isConclusion) { d.goStep(d.step + 1); return; }
    if (isDraft) {
      d.save({ status: 'completed' });
      setSuccessOpen(true);
    } else {
      window.open(`#${routes.excavator.print(effectiveItem.id)}`, '_blank');
    }
  }

  return (
    <>
      <WizardFrame
        open
        onClose={() => navigate(routes.inspections.list())}
        projectName={d.project?.name}
        inspectionName={equipmentInspectionName('excavator')}
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
              <FieldInput label="სერ. ნომერი" value={effectiveItem.serialNumber} disabled={!isDraft} onSave={(v) => d.save({ serialNumber: v })} />
              <FieldInput label="ინვ. ნომერი" value={effectiveItem.inventoryNumber} disabled={!isDraft} onSave={(v) => d.save({ inventoryNumber: v })} />
              <FieldInput label="დეპარტამენტი" value={effectiveItem.department} disabled={!isDraft} onSave={(v) => d.save({ department: v })} />
              <FieldInput label="ინსპექტორი" value={effectiveItem.inspectorName} disabled={!isDraft} onSave={(v) => d.save({ inspectorName: v })} />
              <FieldInput label="თანამდებობა" value={effectiveItem.inspectorPosition} disabled={!isDraft} onSave={(v) => d.save({ inspectorPosition: v })} />
              <Input
                label="შემოწმების თარიღი"
                type="date"
                disabled={!isDraft}
                defaultValue={effectiveItem.inspectionDate ? effectiveItem.inspectionDate.slice(0, 10) : ''}
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== (effectiveItem.inspectionDate ? effectiveItem.inspectionDate.slice(0, 10) : null))
                    d.save({ inspectionDate: v });
                }}
              />
              <Input
                label="წინა შემოწმების თარიღი"
                type="date"
                disabled={!isDraft}
                defaultValue={effectiveItem.lastInspectionDate ? effectiveItem.lastInspectionDate.slice(0, 10) : ''}
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== (effectiveItem.lastInspectionDate ? effectiveItem.lastInspectionDate.slice(0, 10) : null))
                    d.save({ lastInspectionDate: v });
                }}
              />
              <NumberInput
                label="მუშა საათები"
                disabled={!isDraft}
                defaultValue={effectiveItem.motoHours ?? ''}
                onBlur={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  if (v !== effectiveItem.motoHours) d.save({ motoHours: v });
                }}
                hideControls
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
          {SECTIONS.map((s) => {
            const stateList = effectiveItem[s.field] as ExcavatorChecklistItemState[];
            const stateById = new Map(stateList.map((it) => [it.id, it]));
            return (
              <Card key={s.key}>
                <CardHeader>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {s.items.map((entry) => {
                      const st = stateById.get(entry.id) ?? {
                        id: entry.id, result: null, comment: null, photo_paths: [],
                      };
                      return (
                        <ChecklistItemRow
                          key={entry.id}
                          entryId={entry.id}
                          label={entry.label}
                          description={entry.description}
                          options={RESULT_OPTIONS}
                          result={st.result}
                          comment={st.comment}
                          photoPaths={st.photo_paths ?? []}
                          disabled={!isDraft}
                          photoPrefix="excavator"
                          inspectionId={effectiveItem.id}
                          onResult={(r) => patchSection(s.field, entry.id, { result: r })}
                          onComment={(c) => patchSection(s.field, entry.id, { comment: c })}
                          onAddPhoto={(path) =>
                            patchSection(s.field, entry.id, { photo_paths: [...(st.photo_paths ?? []), path] })
                          }
                          onRemovePhoto={(path) =>
                            patchSection(s.field, entry.id, {
                              photo_paths: (st.photo_paths ?? []).filter((p) => p !== path),
                            })
                          }
                        />
                      );
                    })}
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
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="text-sm text-neutral-900">{m.label}</div>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 140 }}>
                          <SegmentedControl
                            fullWidth
                            options={[
                              { label: 'კი', value: 'yes', selectedBg: '#1D9E75' },
                              { label: 'არა', value: 'no', selectedBg: '#EF4444' },
                            ]}
                            selected={st.answer}
                            onSelect={(a) => { if (isDraft) patchMaintenance(m.id, { answer: a === st.answer ? null : (a as 'yes' | 'no') }); }}
                          />
                        </div>
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
                      onSave={(dataUrl) => { d.save({ inspectorSignature: dataUrl }); setSigningOpen(false); }}
                      onCancel={() => setSigningOpen(false)}
                    />
                  )}
                </div>
              ) : isDraft ? (
                signingOpen ? (
                  <SignatureCanvas
                    onSave={(dataUrl) => { d.save({ inspectorSignature: dataUrl }); setSigningOpen(false); }}
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
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">დასკვნა</p>
                    <SegmentedControl
                      fullWidth
                      options={(Object.keys(EXCAVATOR_VERDICT_LABEL) as ExcavatorVerdict[]).map((v, i) => ({
                        label: EXCAVATOR_VERDICT_LABEL[v],
                        value: v,
                        selectedBg: VERDICT_BG[i] ?? '#94A3B8',
                      }))}
                      selected={effectiveItem.verdict}
                      onSelect={(v) => d.save({ verdict: v === effectiveItem.verdict ? null : (v as ExcavatorVerdict) })}
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
                  <div>დასკვნა: {effectiveItem.verdict ? EXCAVATOR_VERDICT_LABEL[effectiveItem.verdict] : '—'}</div>
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
        onGeneratePDF={() => window.open(`#${routes.excavator.print(effectiveItem.id)}`, '_blank')}
        data={successData}
      />
    </>
  );
}
