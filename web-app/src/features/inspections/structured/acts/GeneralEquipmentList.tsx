/**
 * General-equipment free-form list - the act-specific custom step. The inspector
 * builds the equipment list row-by-row (name · model · serial · condition · note),
 * mirroring the mobile "II - აღჭურვილობის სია" section. Also carries the summary
 * conclusion textarea (this act has no verdict).
 */
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SegmentedControl } from '@/components/wizard';
import { VERDICT_GOOD, VERDICT_WARN, VERDICT_BAD } from '@/lib/verdictColors';
import {
  newEquipmentRow,
  type GEEquipmentRow,
  type GeneralEquipmentInspection,
  type GeneralEquipmentPatch,
} from '@/lib/data/generalEquipment';

interface Props {
  model: GeneralEquipmentInspection;
  disabled: boolean;
  save: (patch: GeneralEquipmentPatch) => void;
}

export function GeneralEquipmentList({ model, disabled, save }: Props) {
  const rows = model.equipment ?? [];

  function update(next: GEEquipmentRow[]) {
    save({ equipment: next });
  }
  function patchRow(id: string, patch: Partial<GEEquipmentRow>) {
    update(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">აღჭურვილობის სია</h3>
        <p className="text-sm text-neutral-500">დაამატეთ აღჭურვილობა და მონიშნეთ მდგომარეობა</p>
      </div>

      {rows.map((r, idx) => (
        <div key={r.id} className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">#{idx + 1}</span>
            {!disabled && (
              <button type="button" aria-label="წაშლა" onClick={() => update(rows.filter((x) => x.id !== r.id))} className="text-neutral-400 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input defaultValue={r.name} disabled={disabled} placeholder="დასახელება" onBlur={(e) => { if (e.target.value !== r.name) patchRow(r.id, { name: e.target.value }); }} />
            <Input defaultValue={r.model} disabled={disabled} placeholder="მოდელი" onBlur={(e) => { if (e.target.value !== r.model) patchRow(r.id, { model: e.target.value }); }} />
            <Input defaultValue={r.serialNumber} disabled={disabled} placeholder="სერ. ნომერი" onBlur={(e) => { if (e.target.value !== r.serialNumber) patchRow(r.id, { serialNumber: e.target.value }); }} />
          </div>
          <SegmentedControl
            fullWidth
            options={[
              { label: 'კარგი', value: 'good', selectedBg: VERDICT_GOOD },
              { label: 'საჭ. მომს.', value: 'needs_service', selectedBg: VERDICT_WARN },
              { label: 'გამოუს.', value: 'unusable', selectedBg: VERDICT_BAD },
            ]}
            selected={r.condition}
            onSelect={(v) => { if (!disabled) patchRow(r.id, { condition: v === r.condition ? null : (v as GEEquipmentRow['condition']) }); }}
          />
          <Input defaultValue={r.note} disabled={disabled} placeholder="შენიშვნა" className="text-xs" onBlur={(e) => { if (e.target.value !== r.note) patchRow(r.id, { note: e.target.value }); }} />
        </div>
      ))}

      {!disabled && (
        <button type="button" onClick={() => update([...rows, newEquipmentRow()])} className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600 dark:border-neutral-600">
          <Plus size={15} /> აღჭურვილობის დამატება
        </button>
      )}

      <Textarea
        label="შეჯამება / დასკვნა"
        defaultValue={model.conclusion ?? ''}
        rows={3}
        disabled={disabled}
        placeholder="შეიყვანეთ შეჯამება..."
        onBlur={(e) => { const v = e.target.value || null; if (v !== (model.conclusion ?? null)) save({ conclusion: v }); }}
      />
    </div>
  );
}
