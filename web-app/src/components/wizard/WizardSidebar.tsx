import { useCallback, useRef } from 'react';
import { CheckCircle2, Plus, AlertTriangle } from 'lucide-react';

/**
 * Shared harness/item sidebar. Shown on every step of a grid-based flow
 * (checklist + conclusion) so the list of items is always visible.
 */
type RowStatus = 'pending' | 'in_progress' | 'done' | 'problem';

type GridValues = Record<string, Record<string, string>>;

export function WizardSidebar({
  heading,
  addLabel,
  itemLabel,
  rows,
  addedCount,
  activeIdx,
  values,
  statusCols,
  canAddMore,
  onSelect,
  onAdd,
}: {
  heading: string;
  addLabel: string;
  /** Per-item display noun, e.g. "ქამარი". */
  itemLabel: string;
  rows: string[];
  addedCount: number;
  /** Highlighted item index, or -1 for none. */
  activeIdx: number;
  values: GridValues;
  statusCols: string[];
  canAddMore: boolean;
  onSelect: (i: number) => void;
  onAdd: () => void;
}) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onSelect(Math.min(addedCount - 1, activeIdx + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onSelect(Math.max(0, activeIdx - 1));
      }
    },
    [addedCount, activeIdx, onSelect],
  );

  return (
    <div
      ref={sidebarRef}
      tabIndex={0}
      onKeyDown={handleKey}
      className="w-[260px] shrink-0 overflow-y-auto border-r border-neutral-200 bg-neutral-50 outline-none dark:border-neutral-700 dark:bg-neutral-900/40"
    >
      <p className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {heading}
      </p>

      <button
        type="button"
        onClick={onAdd}
        disabled={!canAddMore}
        className="mx-3 my-2 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border-[1.5px] border-dashed border-neutral-300 px-3 py-2.5 text-[13px] text-neutral-500 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-400"
      >
        <Plus size={15} />
        {addLabel}
      </button>

      <div className="px-2 pb-24">
        {rows.slice(0, addedCount).map((row, i) => {
          const status = rowStatus(row, values, statusCols);
          const isActive = i === activeIdx;
          return (
            <button
              key={row}
              type="button"
              onClick={() => onSelect(i)}
              className={[
                'mx-1 my-0.5 block w-[calc(100%-0.5rem)] rounded-lg border-[1.5px] px-3 py-2.5 text-left transition-colors',
                isActive
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/30'
                  : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/60',
              ].join(' ')}
            >
              <div className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
                {itemLabel} {i + 1}
              </div>
              <StatusLabel status={status} row={row} values={values} statusCols={statusCols} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function rowStatus(row: string, values: GridValues, statusCols: string[]): RowStatus {
  const rv = values[row] ?? {};
  const answered = statusCols.filter((c) => (rv[c] ?? '') !== '');
  const bad = statusCols.filter((c) => rv[c] === 'bad').length;
  if (bad > 0) return 'problem';
  if (answered.length === 0) return 'pending';
  if (answered.length === statusCols.length) return 'done';
  return 'in_progress';
}

function StatusLabel({
  status,
  row,
  values,
  statusCols,
}: {
  status: RowStatus;
  row: string;
  values: GridValues;
  statusCols: string[];
}) {
  const rv = values[row] ?? {};
  const ok = statusCols.filter((c) => rv[c] === 'ok').length;
  const bad = statusCols.filter((c) => rv[c] === 'bad').length;

  if (status === 'pending') {
    return <div className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">შეუვსებელი</div>;
  }
  if (status === 'problem') {
    return (
      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
        <AlertTriangle size={11} />
        {bad} პრობლემა
      </div>
    );
  }
  if (status === 'done') {
    return (
      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400">
        <CheckCircle2 size={11} />
        დასრულდა
      </div>
    );
  }
  return (
    <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
      {ok} კი · {bad} არა
    </div>
  );
}
