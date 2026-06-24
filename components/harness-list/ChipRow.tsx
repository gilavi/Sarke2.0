import { memo } from 'react';
import { Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ChecklistItemRow, type ChecklistRowOption } from '../inspection-parts/ChecklistItemRow';
import type { HarnessItem } from './_shared';

// Belt components are a simple intact/damaged check - the 2-option case of the
// shared ChecklistItemRow. No per-row note/photo; problems are flagged ✗ and
// any photos go on the conclusion step.
function optionsFor(label: string, goodLabel: string, badLabel: string): ChecklistRowOption[] {
  return [
    { value: 'ok', icon: Check, a11yLabel: `${label} - ${goodLabel}` },
    { value: 'bad', icon: X, a11yLabel: `${label} - ${badLabel}` },
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
  const { t } = useTranslation();
  return (
    <ChecklistItemRow
      label={item.label}
      options={optionsFor(item.label, t('harnessList.statusGood'), t('harnessList.statusBad'))}
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
