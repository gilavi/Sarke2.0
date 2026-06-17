import { memo } from 'react';
import { ChecklistItemRow, type ChecklistRowOption } from '../inspection-parts/ChecklistItemRow';
import type { HarnessItem } from './_shared';

// Belt components are a simple intact/damaged check - the 2-option case of the
// shared ChecklistItemRow. No per-row note/photo; problems are flagged ✗ and
// any photos go on the conclusion step.
function optionsFor(label: string): ChecklistRowOption[] {
  return [
    { value: 'ok', icon: 'checkmark', a11yLabel: `${label} - გამართული` },
    { value: 'bad', icon: 'close', a11yLabel: `${label} - დაზიანებული` },
  ];
}

export const ChipRow = memo(function ChipRow({
  item,
  row,
  state,
  onSet,
  onHelp,
}: {
  item: HarnessItem;
  row: string;
  state: 'ok' | 'bad' | undefined;
  // Stable handlers (receive item/row) so memoized rows don't all re-render.
  onSet: (item: HarnessItem, row: string, value: 'ok' | 'bad' | null) => void;
  onHelp: (item: HarnessItem) => void;
}) {
  return (
    <ChecklistItemRow
      label={item.label}
      options={optionsFor(item.label)}
      value={state ?? null}
      onChange={v => onSet(item, row, v as 'ok' | 'bad' | null)}
      onHelp={() => onHelp(item)}
    />
  );
}, (prev, next) =>
  prev.item === next.item &&
  prev.row === next.row &&
  prev.state === next.state &&
  prev.onSet === next.onSet &&
  prev.onHelp === next.onHelp,
);
