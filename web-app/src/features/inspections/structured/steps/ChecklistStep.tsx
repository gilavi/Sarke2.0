/**
 * Category-grouped checklist step for the structured wizard.
 *
 * Two layouts:
 *  - withDetails (photoPrefix set): the rich `ChecklistItemRow` (pills + comment
 *    + photos) per item.
 *  - compact (no photoPrefix): a MATRIX — the answer options are column headers
 *    once at the top of each group, and every question is a row of radio circles
 *    aligned under them (selected = filled ink; meaning carried by the header
 *    label, not colour). Replaces the old per-row SegmentedControl that repeated
 *    the option labels on every question.
 */
import { Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChecklistItemRow } from '@/features/inspections/equipment/components/ChecklistItemRow';
import { cn } from '@/lib/utils';
import type { ResultOption } from '@/features/inspections/equipment/components/ResultPills';
import type { WizardChecklistStep, WizardItemState } from '../types';

interface Props<T, P> {
  step: WizardChecklistStep<T, P>;
  model: T;
  inspectionId: string;
  disabled: boolean;
  onSave: (patch: P) => void;
}

export function ChecklistStep<T, P>({ step, model, inspectionId, disabled, onSave }: Props<T, P>) {
  const states = step.getStates(model);
  const byId = new Map<number, WizardItemState>(states.map((s) => [s.id, s]));
  const withDetails = step.withDetails !== false && !!step.photoPrefix;

  function patchItem(itemId: number, patch: Partial<WizardItemState>) {
    const next = states.map((s) => (s.id === itemId ? { ...s, ...patch } : s));
    // Items not yet in state (first touch) get appended.
    if (!byId.has(itemId)) next.push({ id: itemId, result: null, comment: null, photo_paths: [], ...patch });
    onSave(step.patch(next));
  }

  // Group items by their `group` header (groups render as separate cards).
  const groups = new Map<string, typeof step.items>();
  for (const it of step.items) {
    const key = it.group ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([group, items]) => (
        <Card key={group || step.key}>
          {group && (
            <CardHeader>
              <CardTitle className="text-base">{group}</CardTitle>
            </CardHeader>
          )}
          <CardContent className={withDetails ? 'p-0' : 'pt-1'}>
            {withDetails
              ? items.map((entry) => {
                  const state = byId.get(entry.id) ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
                  const options = entry.options ?? step.resultOptions;
                  return (
                    <ChecklistItemRow
                      key={entry.id}
                      entryId={entry.id}
                      label={entry.label}
                      description={entry.description ?? ''}
                      options={options}
                      result={state.result}
                      comment={state.comment ?? null}
                      photoPaths={state.photo_paths ?? []}
                      disabled={disabled}
                      photoPrefix={step.photoPrefix!}
                      inspectionId={inspectionId}
                      onResult={(r) => patchItem(entry.id, { result: r })}
                      onComment={(c) => patchItem(entry.id, { comment: c })}
                      onAddPhoto={(path) => patchItem(entry.id, { photo_paths: [...(state.photo_paths ?? []), path] })}
                      onRemovePhoto={(path) =>
                        patchItem(entry.id, { photo_paths: (state.photo_paths ?? []).filter((p) => p !== path) })
                      }
                    />
                  );
                })
              : (
                <ChecklistMatrix
                  options={items[0]?.options ?? step.resultOptions}
                  items={items}
                  byId={byId}
                  disabled={disabled}
                  onSelect={(id, v) => patchItem(id, { result: v })}
                />
              )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Matrix checklist: answer options as shared column headers, one radio per
 * option on each question row. Selected = filled ink circle.
 */
function ChecklistMatrix({
  options,
  items,
  byId,
  disabled,
  onSelect,
}: {
  options: ResultOption<string>[];
  items: { id: number; label: string }[];
  byId: Map<number, WizardItemState>;
  disabled: boolean;
  onSelect: (id: number, value: string | null) => void;
}) {
  const cols = `minmax(0,1fr) repeat(${options.length}, 76px)`;
  return (
    <div className="overflow-x-auto">
      <div className="grid items-stretch" style={{ gridTemplateColumns: cols, minWidth: 300 }}>
        {/* Header row: option labels, once */}
        <div className="border-b border-neutral-200 dark:border-neutral-800" />
        {options.map((o) => (
          <div
            key={o.value}
            className="flex items-end justify-center border-b border-neutral-200 px-1 pb-2 text-center text-[11px] font-medium leading-tight text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
          >
            {o.label}
          </div>
        ))}

        {/* Question rows */}
        {items.map((entry, idx) => {
          const result = byId.get(entry.id)?.result ?? null;
          const rowBorder = idx > 0 ? 'border-t border-neutral-100 dark:border-neutral-800/60' : '';
          return (
            <Fragment key={entry.id}>
              <div className={cn('flex items-center py-3 pr-3 text-sm text-neutral-800 dark:text-neutral-200', rowBorder)}>
                <span className="mr-1.5 shrink-0 text-neutral-400">{entry.id}.</span>
                <span className="min-w-0">{entry.label}</span>
              </div>
              {options.map((o) => {
                const sel = result === o.value;
                return (
                  <div key={o.value} className={cn('flex items-center justify-center py-3', rowBorder)}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelect(entry.id, sel ? null : o.value)}
                      aria-label={o.label}
                      aria-pressed={sel}
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border-2 transition disabled:opacity-50',
                        sel
                          ? 'border-neutral-900 bg-neutral-900 dark:border-neutral-100 dark:bg-neutral-100'
                          : 'border-neutral-300 bg-white hover:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900',
                      )}
                    >
                      {sel && <span className="h-2 w-2 rounded-full bg-white dark:bg-neutral-900" />}
                    </button>
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
