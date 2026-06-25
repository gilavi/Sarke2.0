/**
 * Safety-net load-test weight table - the act-specific custom step. Lets the
 * inspector list the weights dropped into the net (name · unit kg · quantity),
 * auto-computes each row's total and the grand total, and persists the rows.
 * Mirrors the mobile load-test section (№477: 180kg from 1m).
 */
import { NumberInput } from '@mantine/core';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  buildDefaultSNLoadTestRow,
  snTotalWeight,
  type SNLoadTestRow,
  type SafetyNetInspection,
  type SafetyNetPatch,
} from '@/lib/data/safetyNet';

interface Props {
  model: SafetyNetInspection;
  disabled: boolean;
  save: (patch: SafetyNetPatch) => void;
}

export function SafetyNetLoadTest({ model, disabled, save }: Props) {
  const rows = model.loadTestRows ?? [];

  function update(rows2: SNLoadTestRow[]) {
    save({ loadTestRows: rows2 });
  }

  function patchRow(id: string, patch: Partial<SNLoadTestRow>) {
    update(
      rows.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        next.totalWeightKg =
          next.unitWeightKg != null && next.quantity != null ? next.unitWeightKg * next.quantity : null;
        return next;
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">დატვირთვის ტესტი</h3>
        <p className="text-sm text-neutral-500">180კგ-ის სიმძიმე 1მ სიმაღლიდან - №477 დადგენილება</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">დასახელება</th>
              <th className="px-3 py-2 text-right">ერთ. წ. (კგ)</th>
              <th className="px-3 py-2 text-right">რ-ბა</th>
              <th className="px-3 py-2 text-right">სულ (კგ)</th>
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
                    placeholder="მაგ: ქვიშის ტომარა"
                    onBlur={(e) => { if (e.target.value !== r.name) patchRow(r.id, { name: e.target.value }); }}
                  />
                </td>
                <td className="px-3 py-2">
                  <NumberInput
                    value={r.unitWeightKg ?? ''}
                    disabled={disabled}
                    hideControls
                    onChange={(v) => patchRow(r.id, { unitWeightKg: v === '' ? null : Number(v) })}
                  />
                </td>
                <td className="px-3 py-2">
                  <NumberInput
                    value={r.quantity ?? ''}
                    disabled={disabled}
                    hideControls
                    onChange={(v) => patchRow(r.id, { quantity: v === '' ? null : Number(v) })}
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{r.totalWeightKg ?? '-'}</td>
                <td className="px-2 py-2 text-center">
                  {!disabled && (
                    <button
                      type="button"
                      aria-label="წაშლა"
                      onClick={() => update(rows.filter((x) => x.id !== r.id))}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 bg-neutral-50 font-semibold dark:border-neutral-700 dark:bg-neutral-900/40">
              <td className="px-3 py-2" colSpan={3}>სულ</td>
              <td className="px-3 py-2 text-right tabular-nums">{snTotalWeight(rows)} კგ</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={() => update([...rows, buildDefaultSNLoadTestRow()])}
          className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600 dark:border-neutral-600"
        >
          <Plus size={15} /> მწკრივის დამატება
        </button>
      )}
    </div>
  );
}
