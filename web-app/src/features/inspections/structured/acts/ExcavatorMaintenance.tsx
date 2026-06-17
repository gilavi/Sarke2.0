/**
 * Excavator maintenance custom step - yes/no + optional date per maintenance
 * item. Mirrors the mobile excavator "VI - ტექნიკური მომსახურება" section.
 */
import { SegmentedControl } from '@/components/wizard';
import { VERDICT_GOOD, VERDICT_BAD } from '@/lib/verdictColors';
import {
  MAINTENANCE_ITEMS,
  type ExcavatorInspection,
  type ExcavatorPatch,
  type ExcavatorMaintenanceItemState,
} from '@/lib/data/excavator';

interface Props {
  model: ExcavatorInspection;
  disabled: boolean;
  save: (patch: ExcavatorPatch) => void;
}

export function ExcavatorMaintenance({ model, disabled, save }: Props) {
  const states = model.maintenanceItems ?? [];
  const byId = new Map<number, ExcavatorMaintenanceItemState>(states.map((s) => [s.id, s]));

  function patchItem(id: number, patch: Partial<ExcavatorMaintenanceItemState>) {
    const base = MAINTENANCE_ITEMS.map(
      (e) => byId.get(e.id) ?? { id: e.id, answer: null, date: null },
    );
    save({ maintenanceItems: base.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">ტექნიკური მომსახურება</h3>
        <p className="text-sm text-neutral-500">მონიშნეთ შესრულება და, საჭიროების შემთხვევაში, თარიღი</p>
      </div>

      {MAINTENANCE_ITEMS.map((entry) => {
        const st = byId.get(entry.id) ?? { id: entry.id, answer: null, date: null };
        return (
          <div key={entry.id} className="space-y-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{entry.label}</div>
            <div className="flex items-center gap-3">
              <div style={{ width: 160 }}>
                <SegmentedControl
                  fullWidth
                  options={[
                    { label: 'კი', value: 'yes', selectedBg: VERDICT_GOOD },
                    { label: 'არა', value: 'no', selectedBg: VERDICT_BAD },
                  ]}
                  selected={st.answer}
                  onSelect={(v) => { if (!disabled) patchItem(entry.id, { answer: v === st.answer ? null : (v as 'yes' | 'no') }); }}
                />
              </div>
              <input
                type="date"
                disabled={disabled}
                defaultValue={st.date ?? ''}
                onChange={(e) => patchItem(entry.id, { date: e.target.value || null })}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
