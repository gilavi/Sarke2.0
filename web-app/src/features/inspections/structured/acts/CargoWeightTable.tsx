/**
 * Cargo-platform weight table — the act-specific custom step. Lists the cargo
 * placed on the platform (name · unit kg · total kg) with a grand total, mirroring
 * the mobile "III — ტვირთის იდენტიფიკაცია" section.
 */
import { NumberInput } from '@mantine/core';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  newCargoRow,
  cpTotalWeight,
  type CPCargoRow,
  type CargoPlatformInspection,
  type CargoPlatformPatch,
} from '@/lib/data/cargoPlatform';

interface Props {
  model: CargoPlatformInspection;
  disabled: boolean;
  save: (patch: CargoPlatformPatch) => void;
}

export function CargoWeightTable({ model, disabled, save }: Props) {
  const rows = model.cargo ?? [];

  function update(next: CPCargoRow[]) {
    save({ cargo: next });
  }

  function patchRow(id: string, patch: Partial<CPCargoRow>) {
    update(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">ტვირთის იდენტიფიკაცია</h3>
        <p className="text-sm text-neutral-500">პლატფორმაზე განთავსებული ტვირთის წონები</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900/40">
            <tr>
              <th className="px-3 py-2 text-left">დასახელება</th>
              <th className="px-3 py-2 text-right">ერთ. წონა (კგ)</th>
              <th className="px-3 py-2 text-right">სრ. წონა (კგ)</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-3 py-2">
                  <Input
                    defaultValue={r.name}
                    disabled={disabled}
                    placeholder="დასახელება"
                    onBlur={(e) => { if (e.target.value !== r.name) patchRow(r.id, { name: e.target.value }); }}
                  />
                </td>
                <td className="px-3 py-2">
                  <NumberInput
                    value={r.unit_weight_kg ?? ''}
                    disabled={disabled}
                    hideControls
                    onChange={(v) => patchRow(r.id, { unit_weight_kg: v === '' ? null : Number(v) })}
                  />
                </td>
                <td className="px-3 py-2">
                  <NumberInput
                    value={r.total_weight_kg ?? ''}
                    disabled={disabled}
                    hideControls
                    onChange={(v) => patchRow(r.id, { total_weight_kg: v === '' ? null : Number(v) })}
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  {!disabled && (
                    <button type="button" aria-label="წაშლა" onClick={() => update(rows.filter((x) => x.id !== r.id))} className="text-neutral-400 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 bg-neutral-50 font-semibold dark:border-neutral-700 dark:bg-neutral-900/40">
              <td className="px-3 py-2" colSpan={2}>სულ</td>
              <td className="px-3 py-2 text-right tabular-nums">{cpTotalWeight(rows)} კგ</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={() => update([...rows, newCargoRow()])}
          className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600 dark:border-neutral-600"
        >
          <Plus size={15} /> მწკრივის დამატება
        </button>
      )}
    </div>
  );
}
