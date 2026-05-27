/**
 * General-equipment ("ტექ. აქტი") inspection detail.
 *
 * Built on the shared equipment engine (useEquipmentDetail + shared widgets).
 * General-equipment-specific: an add/remove equipment-row table (each row a
 * condition + photos), an inspection-type selector, a signer (name + role), and
 * a free-text conclusion instead of a verdict.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DeleteButton from '@/components/DeleteButton';
import InspectionSignatures from '@/components/InspectionSignatures';
import SignatureCanvas from '@/components/SignatureCanvas';
import FieldInput from '@/components/FieldInput';
import PhotoUploadZone from '@/components/PhotoUploadZone';
import { WizardFrame, SegmentedControl } from '@/components/wizard';
import SuccessModal, { type SuccessModalData } from '@/components/web/SuccessModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { ErrorView, EmptyView } from '@/components/async/AsyncBoundary';
import { routes } from '@/app/routes';
import { generalEquipmentKeys } from '@/app/queryKeys';
import { equipmentInspectionName } from '@/lib/documentNames';
import {
  createGeneralEquipmentInspection,
  deleteGeneralEquipmentInspection,
  getGeneralEquipmentInspection,
  newEquipmentRow,
  updateGeneralEquipmentInspection,
  type CreateGeneralEquipmentArgs,
  type GECondition,
  type GEEquipmentRow,
  type GEInspectionType,
  type GeneralEquipmentInspection,
  type GeneralEquipmentPatch,
  type GESignerRole,
} from '@/lib/data/generalEquipment';
import { useEquipmentDetail } from './useEquipmentDetail';
import { type ResultOption, type ResultTone } from './components/ResultPills';
import { VERDICT_GOOD, VERDICT_WARN, VERDICT_BAD, VERDICT_NEUTRAL } from '@/lib/verdictColors';

const TONE_BG: Record<ResultTone, string> = {
  good: VERDICT_GOOD,
  warn: VERDICT_WARN,
  bad: VERDICT_BAD,
  neutral: VERDICT_NEUTRAL,
};

const CONDITION_OPTIONS: ResultOption<GECondition>[] = [
  { value: 'good', label: 'ნორმაში', tone: 'good' },
  { value: 'needs_service', label: 'ტექ. მომსახურება', tone: 'warn' },
  { value: 'unusable', label: 'გამოუსადეგ.', tone: 'bad' },
];

const CONDITION_SEG = CONDITION_OPTIONS.map((o) => ({ label: o.label, value: o.value, selectedBg: TONE_BG[o.tone] }));
const STEP_LABELS = ['ინფო', 'შემოწმება', 'დასკვნა'];

const INSPECTION_TYPES: [GEInspectionType, string][] = [
  ['initial', 'პირველადი'],
  ['repeat', 'განმეორებითი'],
  ['scheduled', 'დაგეგმილი'],
];

const SIGNER_ROLES: [GESignerRole, string][] = [
  ['electrician', 'ელექტრიკოსი'],
  ['technician', 'ტექნიკოსი'],
  ['safety_specialist', 'უსაფრთხ. სპეც.'],
  ['other', 'სხვა'],
];

export default function GeneralEquipmentDetail() {
  const navigate = useNavigate();
  const d = useEquipmentDetail<GeneralEquipmentInspection, GeneralEquipmentPatch, CreateGeneralEquipmentArgs>({
    get: getGeneralEquipmentInspection,
    update: updateGeneralEquipmentInspection,
    remove: deleteGeneralEquipmentInspection,
    detailKey: generalEquipmentKeys.detail,
    listKey: generalEquipmentKeys.lists,
    getProjectId: (i) => i.projectId,
  });

  const [signingOpen, setSigningOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  if (d.isLoading) return <SkeletonDetailPage />;
  if (d.isError) return <ErrorView error={d.error} />;
  if (!d.item && !d.isPending) return <EmptyView message="აქტი ვერ მოიძებნა." />;

  const effectiveItem: GeneralEquipmentInspection = d.item ?? {
    id: 'draft',
    status: 'draft',
    projectId: d.pendingCreate?.projectId ?? '',
    templateId: null,
    userId: '',
    objectName: d.pendingCreate?.objectName ?? null,
    address: null,
    activityType: d.pendingCreate?.activityType ?? null,
    actNumber: d.pendingCreate?.actNumber ?? null,
    department: d.pendingCreate?.department ?? null,
    inspectorName: d.pendingCreate?.inspectorName ?? null,
    inspectionDate: d.pendingCreate?.inspectionDate ?? new Date().toISOString().slice(0, 10),
    inspectionType: d.pendingCreate?.inspectionType ?? null,
    equipment: [],
    inspectorSignature: null,
    signatories: [],
    signerName: null,
    signerRole: null,
    signerRoleCustom: null,
    summaryPhotos: [],
    conclusion: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  const isDraft = effectiveItem.status === 'draft';

  function patchRow(rowId: string, patch: Partial<GEEquipmentRow>) {
    if (!d.item) return;
    const equipment = effectiveItem.equipment.map((r) => (r.id === rowId ? { ...r, ...patch } : r));
    d.save({ equipment });
  }

  async function addRow() {
    if (d.isPending && d.pendingCreate) {
      try {
        const realId = await d.lazyCreate(createGeneralEquipmentInspection);
        if (!realId) return;
        const newRow = newEquipmentRow();
        await updateGeneralEquipmentInspection(realId, { equipment: [newRow] });
        d.qc.invalidateQueries({ queryKey: generalEquipmentKeys.lists() });
        navigate(routes.generalEquipment.detail(realId), { replace: true, state: {} });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (!d.item) return;
    d.save({ equipment: [...effectiveItem.equipment, newEquipmentRow()] });
  }

  function removeRow(rowId: string) {
    if (!d.item) return;
    d.save({ equipment: effectiveItem.equipment.filter((r) => r.id !== rowId) });
  }

  const total = STEP_LABELS.length;
  const isConclusion = d.step === total - 1;

  const evaluated = effectiveItem.equipment.filter((r) => r.condition !== null);
  const goodCount = evaluated.filter((r) => r.condition === 'good').length;
  const successData: SuccessModalData = {
    totalCount: evaluated.length,
    safeCount: goodCount,
    problemCount: evaluated.length - goodCount,
    inspectionName: equipmentInspectionName('general'),
    projectName: d.project?.name ?? '',
    itemLabel: 'ერთეული',
  };

  function handleNext() {
    if (!isConclusion) { d.goStep(d.step + 1); return; }
    if (isDraft) {
      d.save({ status: 'completed' });
      setSuccessOpen(true);
    } else {
      window.open(`#${routes.generalEquipment.print(effectiveItem.id)}`, '_blank');
    }
  }

  return (
    <>
      <WizardFrame
        open
        onClose={() => navigate(routes.inspections.list())}
        projectName={d.project?.name}
        inspectionName={equipmentInspectionName('general')}
        stepName={`${STEP_LABELS[d.step]} · ${d.step + 1}/${total}`}
        showProgress
        progressPercent={(d.step / (total - 1)) * 100}
        closeDisabled={d.updating}
        stepKey={d.step}
        direction={d.direction}
        onBack={() => d.goStep(d.step - 1)}
        onNext={handleNext}
        backDisabled={d.step === 0 || d.updating}
        nextDisabled={isConclusion && isDraft ? d.updating || d.isPending : false}
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
              <FieldInput label="ობიექტი" value={effectiveItem.objectName} disabled={!isDraft} onSave={(v) => d.save({ objectName: v })} />
              <FieldInput label="მისამართი" value={effectiveItem.address} disabled={!isDraft} onSave={(v) => d.save({ address: v })} />
              <FieldInput label="საქმიანობის ტიპი" value={effectiveItem.activityType} disabled={!isDraft} onSave={(v) => d.save({ activityType: v })} />
              <FieldInput label="აქტის ნომერი" value={effectiveItem.actNumber} disabled={!isDraft} onSave={(v) => d.save({ actNumber: v })} />
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
              <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">შემოწმების სახეობა</p>
                <SegmentedControl
                  fullWidth
                  options={INSPECTION_TYPES.map(([val, label]) => ({ label, value: val, selectedBg: VERDICT_GOOD }))}
                  selected={effectiveItem.inspectionType}
                  onSelect={(val) => { if (isDraft) d.save({ inspectionType: effectiveItem.inspectionType === val ? null : (val as GEInspectionType) }); }}
                />
              </div>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                აღჭურვილობა
                <span className="ml-2 text-sm font-normal text-neutral-400">({effectiveItem.equipment.length})</span>
              </CardTitle>
              {isDraft && (
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus size={14} className="mr-1" />
                  დამატება
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {effectiveItem.equipment.length === 0 ? (
                <p className="text-sm text-neutral-500">სტრიქონები არ არის.</p>
              ) : (
                <ul className="space-y-3">
                  {effectiveItem.equipment.map((row, idx) => (
                    <li key={row.id} className="rounded-lg border border-neutral-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-500">#{idx + 1}</span>
                        {isDraft && (
                          <button type="button" onClick={() => removeRow(row.id)} className="text-neutral-400 hover:text-red-500">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Input
                          disabled={!isDraft}
                          defaultValue={row.name}
                          onBlur={(e) => { if (e.target.value !== row.name) patchRow(row.id, { name: e.target.value }); }}
                          placeholder="დასახელება"
                        />
                        <Input
                          disabled={!isDraft}
                          defaultValue={row.model}
                          onBlur={(e) => { if (e.target.value !== row.model) patchRow(row.id, { model: e.target.value }); }}
                          placeholder="მოდელი"
                        />
                        <Input
                          disabled={!isDraft}
                          defaultValue={row.serialNumber}
                          onBlur={(e) => { if (e.target.value !== row.serialNumber) patchRow(row.id, { serialNumber: e.target.value }); }}
                          placeholder="სერ. ნომერი"
                        />
                      </div>
                      <div className="mt-2">
                        <SegmentedControl
                          fullWidth
                          options={CONDITION_SEG}
                          selected={row.condition}
                          onSelect={(c) => { if (isDraft) patchRow(row.id, { condition: c === row.condition ? null : (c as GECondition) }); }}
                        />
                      </div>
                      <Input
                        disabled={!isDraft}
                        defaultValue={row.note}
                        onBlur={(e) => { if (e.target.value !== row.note) patchRow(row.id, { note: e.target.value }); }}
                        placeholder="შენიშვნა"
                        className="mt-2 text-xs"
                      />
                      <div className="mt-2">
                        <PhotoUploadZone
                          paths={row.photo_paths ?? []}
                          disabled={!isDraft}
                          prefix="general-equipment"
                          inspectionId={effectiveItem.id}
                          itemId={row.id}
                          onAdd={(path) => patchRow(row.id, { photo_paths: [...(row.photo_paths ?? []), path] })}
                          onRemove={(path) =>
                            patchRow(row.id, { photo_paths: (row.photo_paths ?? []).filter((p) => p !== path) })
                          }
                          placeholder="ფოტო არ არის სავალდებულო"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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
              <CardTitle className="text-base">ხელმომწერი</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <FieldInput label="სახელი, გვარი" value={effectiveItem.signerName} disabled={!isDraft} onSave={(v) => d.save({ signerName: v })} />
              <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">როლი</p>
                <SegmentedControl
                  fullWidth
                  options={SIGNER_ROLES.map(([val, label]) => ({ label, value: val, selectedBg: VERDICT_GOOD }))}
                  selected={effectiveItem.signerRole}
                  onSelect={(val) => { if (isDraft) d.save({ signerRole: effectiveItem.signerRole === val ? null : (val as GESignerRole) }); }}
                />
              </div>
              {effectiveItem.signerRole === 'other' && (
                <div className="sm:col-span-2">
                  <FieldInput label="სხვა როლი" value={effectiveItem.signerRoleCustom} disabled={!isDraft} onSave={(v) => d.save({ signerRoleCustom: v })} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">დასკვნა</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isDraft ? (
                <Textarea
                  rows={3}
                  defaultValue={effectiveItem.conclusion ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value || null;
                    if (v !== effectiveItem.conclusion) d.save({ conclusion: v });
                  }}
                  placeholder="დასკვნის ტექსტი"
                />
              ) : (
                <p className="text-sm text-neutral-700">{effectiveItem.conclusion || '—'}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </WizardFrame>

      <SuccessModal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        onGeneratePDF={() => window.open(`#${routes.generalEquipment.print(effectiveItem.id)}`, '_blank')}
        data={successData}
      />
    </>
  );
}
