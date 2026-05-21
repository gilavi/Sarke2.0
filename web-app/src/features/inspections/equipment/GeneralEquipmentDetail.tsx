/**
 * General-equipment ("ტექ. აქტი") inspection detail.
 *
 * Built on the shared equipment engine (useEquipmentDetail + shared widgets).
 * General-equipment-specific: an add/remove equipment-row table (each row a
 * condition + photos), an inspection-type selector, a signer (name + role), and
 * a free-text conclusion instead of a verdict.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea, TextInput } from '@mantine/core';
import DeleteButton from '@/components/DeleteButton';
import InspectionSignatures from '@/components/InspectionSignatures';
import SignatureCanvas from '@/components/SignatureCanvas';
import FieldInput from '@/components/FieldInput';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import WizardSteps, { WizardNav } from '@/components/WizardSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { ErrorView, EmptyView } from '@/components/async/AsyncBoundary';
import { routes } from '@/app/routes';
import { generalEquipmentKeys } from '@/app/queryKeys';
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
import { CompletedBanner } from './components/CompletedBanner';
import { InspectionPdfOverlay } from './components/InspectionPdfOverlay';
import { ResultPills, type ResultOption } from './components/ResultPills';

const CONDITION_OPTIONS: ResultOption<GECondition>[] = [
  { value: 'good', label: 'ნორმაში', tone: 'good' },
  { value: 'needs_service', label: 'ტექ. მომსახურება', tone: 'warn' },
  { value: 'unusable', label: 'გამოუსადეგ.', tone: 'bad' },
];

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
              {effectiveItem.objectName || 'მოწყობილობა'}
            </span>
          </nav>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
            {effectiveItem.objectName || (d.isPending ? 'ახალი ტექ. აქტი' : `ტექ. აქტი #${effectiveItem.id.slice(0, 8)}`)}
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
              <FieldInput label="ობიექტი" value={effectiveItem.objectName} disabled={!isDraft} onSave={(v) => d.save({ objectName: v })} />
              <FieldInput label="მისამართი" value={effectiveItem.address} disabled={!isDraft} onSave={(v) => d.save({ address: v })} />
              <FieldInput label="საქმიანობის ტიპი" value={effectiveItem.activityType} disabled={!isDraft} onSave={(v) => d.save({ activityType: v })} />
              <FieldInput label="აქტის ნომერი" value={effectiveItem.actNumber} disabled={!isDraft} onSave={(v) => d.save({ actNumber: v })} />
              <TextInput
                label="შემოწმების თარიღი"
                type="date"
                disabled={!isDraft}
                defaultValue={effectiveItem.inspectionDate ? effectiveItem.inspectionDate.slice(0, 10) : ''}
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== (effectiveItem.inspectionDate ? effectiveItem.inspectionDate.slice(0, 10) : null))
                    d.save({ inspectionDate: v });
                }}
                radius="md"
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">შემოწმების სახეობა</p>
                <div className="flex flex-wrap gap-2">
                  {INSPECTION_TYPES.map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      disabled={!isDraft}
                      onClick={() => d.save({ inspectionType: effectiveItem.inspectionType === val ? null : val })}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                        effectiveItem.inspectionType === val
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <FieldInput label="დეპარტამენტი" value={effectiveItem.department} disabled={!isDraft} onSave={(v) => d.save({ department: v })} />
              <FieldInput label="ინსპექტორი" value={effectiveItem.inspectorName} disabled={!isDraft} onSave={(v) => d.save({ inspectorName: v })} />
            </CardContent>
          </Card>
          <WizardNav current={d.step} total={3} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.step === 1 && (
        <>
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
                        <TextInput
                          disabled={!isDraft}
                          defaultValue={row.name}
                          onBlur={(e) => { if (e.target.value !== row.name) patchRow(row.id, { name: e.target.value }); }}
                          placeholder="დასახელება"
                          radius="md"
                        />
                        <TextInput
                          disabled={!isDraft}
                          defaultValue={row.model}
                          onBlur={(e) => { if (e.target.value !== row.model) patchRow(row.id, { model: e.target.value }); }}
                          placeholder="მოდელი"
                          radius="md"
                        />
                        <TextInput
                          disabled={!isDraft}
                          defaultValue={row.serialNumber}
                          onBlur={(e) => { if (e.target.value !== row.serialNumber) patchRow(row.id, { serialNumber: e.target.value }); }}
                          placeholder="სერ. ნომერი"
                          radius="md"
                        />
                      </div>
                      <ResultPills
                        options={CONDITION_OPTIONS}
                        value={row.condition}
                        disabled={!isDraft}
                        onSelect={(c) => patchRow(row.id, { condition: c })}
                      />
                      <TextInput
                        disabled={!isDraft}
                        defaultValue={row.note}
                        onBlur={(e) => { if (e.target.value !== row.note) patchRow(row.id, { note: e.target.value }); }}
                        placeholder="შენიშვნა"
                        classNames={{ input: 'mt-2 text-xs' }}
                        radius="md"
                      />
                      <PhotoUploadWidget
                        paths={row.photo_paths ?? []}
                        disabled={!isDraft}
                        prefix="general-equipment"
                        inspectionId={effectiveItem.id}
                        itemId={row.id}
                        onAdd={(path) => patchRow(row.id, { photo_paths: [...(row.photo_paths ?? []), path] })}
                        onRemove={(path) =>
                          patchRow(row.id, { photo_paths: (row.photo_paths ?? []).filter((p) => p !== path) })
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
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
                <div className="flex flex-wrap gap-2">
                  {SIGNER_ROLES.map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      disabled={!isDraft}
                      onClick={() => d.save({ signerRole: effectiveItem.signerRole === val ? null : val })}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                        effectiveItem.signerRole === val
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
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
                <>
                  <Textarea
                    rows={3}
                    defaultValue={effectiveItem.conclusion ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value || null;
                      if (v !== effectiveItem.conclusion) d.save({ conclusion: v });
                    }}
                    placeholder="დასკვნის ტექსტი"
                    radius="md"
                    autosize={false}
                  />
                  <Button size="sm" onClick={() => d.save({ status: 'completed' })} disabled={d.isPending || d.updating}>
                    დასრულება
                  </Button>
                </>
              ) : (
                <p className="text-sm text-neutral-700">{effectiveItem.conclusion || '—'}</p>
              )}
            </CardContent>
          </Card>
          <WizardNav current={d.step} total={3} onPrev={() => d.setStep(d.step - 1)} onNext={() => d.setStep(d.step + 1)} />
        </>
      )}

      {d.pdfOpen && (
        <InspectionPdfOverlay
          src={`#${routes.generalEquipment.print(effectiveItem.id)}?preview=1`}
          onClose={() => d.setPdfOpen(false)}
        />
      )}
    </div>
  );
}
