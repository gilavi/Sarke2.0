/**
 * Category-grouped checklist step for the structured wizard — the AUDIT LEDGER.
 *
 * Two layouts:
 *  - withDetails (photoPrefix set): the rich `ChecklistItemRow` (seg control +
 *    comment + photos) per item.
 *  - compact (no photoPrefix): the LEDGER — one row per item as a grid
 *    [mono number] · [title + muted subtitle, fills width] · [seg control,
 *    fixed width, right-aligned], hairline divider between rows. No per-item
 *    cards: the step reads as one clean sheet. Groups (A / B …) get a small mono
 *    uppercase letter-spaced muted eyebrow + a hairline rule across the width.
 *    Selection is monochrome ink — meaning is carried by the segment label, not
 *    colour.
 */
import { ChecklistItemRow } from '@/features/inspections/equipment/components/ChecklistItemRow';
import { SegmentedControl } from '@/components/wizard';
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

  // Group items by their `group` header.
  const groups = new Map<string, typeof step.items>();
  for (const it of step.items) {
    const key = it.group ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }

  // Rich (details) layout keeps its bordered rows; the ledger owns its own
  // dividers so it needs no wrapping card.
  if (withDetails) {
    return (
      <div className="space-y-8">
        {[...groups.entries()].map(([group, items]) => (
          <section key={group || step.key}>
            {group && <SectionEyebrow label={group} />}
            <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {items.map((entry) => {
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
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([group, items]) => (
        <section key={group || step.key}>
          {group && <SectionEyebrow label={group} />}
          <LedgerRows
            options={items[0]?.options ?? step.resultOptions}
            items={items}
            byId={byId}
            disabled={disabled}
            onSelect={(id, v) => patchItem(id, { result: v })}
          />
        </section>
      ))}
    </div>
  );
}

/**
 * Section eyebrow: mono, uppercase, letter-spaced, muted — sits above each
 * group. The hairline rule across the width is owned by the row list below it.
 */
function SectionEyebrow({ label }: { label: string }) {
  return (
    <div
      className="font-mono uppercase"
      style={{
        fontSize: 11,
        letterSpacing: '0.12em',
        color: 'var(--text-muted)',
        marginBottom: 8,
      }}
    >
      {label}
    </div>
  );
}

/**
 * Ledger rows: [mono number] · [title fills width] · [seg control, fixed width,
 * right-aligned]. Hairline divider between rows; the group's top hairline rule
 * is the first row's top border.
 */
function LedgerRows({
  options,
  items,
  byId,
  disabled,
  onSelect,
}: {
  options: ResultOption<string>[];
  items: { id: number; label: string; description?: string }[];
  byId: Map<number, WizardItemState>;
  disabled: boolean;
  onSelect: (id: number, value: string | null) => void;
}) {
  const segOptions = options.map((o) => ({ label: o.label, value: o.value }));
  return (
    <div role="list">
      {items.map((entry) => {
        const result = byId.get(entry.id)?.result ?? null;
        return (
          <div
            key={entry.id}
            role="listitem"
            style={{
              paddingTop: 14,
              paddingBottom: 14,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            {/* Title on its own line; the answer control spans the full row width
                below it so multi-word labels never clip into 56px cells. */}
            <div className="flex items-start gap-3">
              <span
                className="font-mono tabular-nums"
                style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: '1.75ch', textAlign: 'right', marginTop: 2 }}
              >
                {entry.id}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-neutral-900 dark:text-neutral-100">{entry.label}</div>
                {entry.description && (
                  <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {entry.description}
                  </div>
                )}
                <div className="mt-2.5">
                  <SegmentedControl
                    fullWidth
                    height={40}
                    options={segOptions}
                    selected={result}
                    onSelect={(v) => { if (!disabled) onSelect(entry.id, v === result ? null : v); }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
