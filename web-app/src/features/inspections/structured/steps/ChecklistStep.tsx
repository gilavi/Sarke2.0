/**
 * Category-grouped checklist step for the structured wizard. Renders the shared
 * equipment `ChecklistItemRow` (3-state pills + comment + photos) for full items,
 * or a compact pill-only row when `withDetails` is false (e.g. safety-net's
 * pass/fail post-test). Item state is spliced by id and pushed back through the
 * descriptor's `patch`.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentedControl } from '@/components/wizard';
import { ChecklistItemRow } from '@/features/inspections/equipment/components/ChecklistItemRow';
import { VERDICT_GOOD, VERDICT_WARN, VERDICT_BAD, VERDICT_NEUTRAL } from '@/lib/verdictColors';
import type { ResultTone } from '@/features/inspections/equipment/components/ResultPills';
import type { WizardChecklistStep, WizardItemState } from '../types';

const TONE_BG: Record<ResultTone, string> = {
  good: VERDICT_GOOD,
  warn: VERDICT_WARN,
  bad: VERDICT_BAD,
  neutral: VERDICT_NEUTRAL,
};

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
          <CardContent className={withDetails ? 'p-0' : 'space-y-3'}>
            {items.map((entry) => {
              const state = byId.get(entry.id) ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
              const options = entry.options ?? step.resultOptions;
              if (withDetails) {
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
              }
              return (
                <div key={entry.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {entry.id}. {entry.label}
                  </div>
                  <div className="shrink-0" style={{ width: 200 }}>
                    <SegmentedControl
                      fullWidth
                      options={options.map((o) => ({ label: o.label, value: o.value, selectedBg: TONE_BG[o.tone] }))}
                      selected={state.result}
                      onSelect={(v) => { if (!disabled) patchItem(entry.id, { result: v === state.result ? null : v }); }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
