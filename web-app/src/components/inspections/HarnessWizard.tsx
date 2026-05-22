import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from '@mantine/core';
import { CheckCircle2, Loader2, Plus, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import type { Question, Answer } from '@/lib/data/inspections';

interface HarnessWizardProps {
  question: Question;
  answer?: Partial<Answer>;
  onChange: (patch: Partial<Answer>) => void;
  onComplete: () => Promise<void> | void;
  /** Navigate to the previous wizard step (info). */
  onBack?: () => void;
  completing?: boolean;
}

// Values stored in grid_values must match the mobile app's cellState() mapping:
// 'ok' → good, 'bad' → problem, '' → unset (N/A / not evaluated).
const STATUS_OPTIONS = [
  { label: 'კი',  value: 'ok'  },
  { label: 'არა', value: 'bad' },
  { label: 'N/A', value: ''    },
] as const;
type StatusValue = 'ok' | 'bad' | '';

type RowStatus = 'pending' | 'in_progress' | 'done' | 'problem';

export default function HarnessWizard({
  question,
  answer,
  onChange,
  onComplete,
  onBack,
  completing = false,
}: HarnessWizardProps) {
  const rows = useMemo(() => question.grid_rows ?? [], [question.grid_rows]);
  const cols = useMemo(() => question.grid_cols ?? [], [question.grid_cols]);
  const statusCols = useMemo(() => cols.filter((c) => c !== 'კომენტარი'), [cols]);
  const hasComment = cols.includes('კომენტარი');

  const values: Record<string, Record<string, string>> = useMemo(
    () => answer?.grid_values ?? {},
    [answer?.grid_values],
  );

  // How many harnesses are revealed in the sidebar. Start with every row that
  // already holds data (resumed inspection), but always show at least one.
  const initialAdded = useMemo(() => {
    let last = 0;
    rows.forEach((row, i) => {
      if (statusCols.some((c) => (values[row]?.[c] ?? '') !== '')) last = i + 1;
    });
    return Math.max(1, last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [addedCount, setAddedCount] = useState(initialAdded);
  const [activeIdx, setActiveIdx] = useState(0);

  const activeRow = rows[activeIdx] ?? '';
  const canAddMore = addedCount < rows.length;

  const setCell = useCallback(
    (row: string, col: string, value: string) => {
      const next = { ...values, [row]: { ...(values[row] ?? {}), [col]: value } };
      onChange({ grid_values: next });
    },
    [values, onChange],
  );

  const rowStatus = useCallback(
    (row: string): RowStatus => {
      const rv = values[row] ?? {};
      const answered = statusCols.filter((c) => (rv[c] ?? '') !== '');
      const bad = statusCols.filter((c) => rv[c] === 'bad').length;
      if (bad > 0) return 'problem';
      if (answered.length === 0) return 'pending';
      if (answered.length === statusCols.length) return 'done';
      return 'in_progress';
    },
    [values, statusCols],
  );

  const handleAddHarness = useCallback(() => {
    if (!canAddMore) return;
    setActiveIdx(addedCount);
    setAddedCount((n) => n + 1);
  }, [canAddMore, addedCount]);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const handleSidebarKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(addedCount - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      }
    },
    [addedCount],
  );

  if (rows.length === 0 || cols.length === 0) {
    return <p className="p-8 text-sm text-neutral-500">ბადის მონაცემები ვერ მოიძებნა.</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Sidebar + main ─────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT SIDEBAR */}
        <div
          ref={sidebarRef}
          tabIndex={0}
          onKeyDown={handleSidebarKey}
          className="w-[260px] shrink-0 overflow-y-auto border-r border-neutral-200 bg-neutral-50 outline-none dark:border-neutral-700 dark:bg-neutral-900/40"
        >
          <p className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            ქამარები
          </p>

          {/* Add-new card */}
          <button
            type="button"
            onClick={handleAddHarness}
            disabled={!canAddMore}
            className="mx-3 my-2 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border-[1.5px] border-dashed border-neutral-300 px-3 py-2.5 text-[13px] text-neutral-500 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-400"
          >
            <Plus size={15} />
            ახალი ქამარი
          </button>

          {/* Harness list */}
          <div className="px-2 pb-4">
            {rows.slice(0, addedCount).map((row, i) => {
              const status = rowStatus(row);
              const isActive = i === activeIdx;
              return (
                <button
                  key={row}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={[
                    'mx-1 my-0.5 block w-[calc(100%-0.5rem)] rounded-lg border-[1.5px] px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'border-brand-500 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/30'
                      : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/60',
                  ].join(' ')}
                >
                  <div className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
                    ქამარი {i + 1}
                  </div>
                  <StatusLabel status={status} row={row} values={values} statusCols={statusCols} />
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-white dark:bg-neutral-900">
          <div className="mx-auto max-w-[680px] px-8 py-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRow}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  ქამარი {activeIdx + 1}
                </h2>
                <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                  შეამოწმეთ ყველა პუნქტი
                </p>
                <div className="my-5 border-t border-neutral-200 dark:border-neutral-700" />

                {/* Question table */}
                <div>
                  {statusCols.map((col, ri) => {
                    const current = (values[activeRow]?.[col] ?? '') as StatusValue;
                    return (
                      <QuestionRow
                        key={col}
                        label={col}
                        value={current}
                        zebra={ri % 2 === 1}
                        onSelect={(v) => setCell(activeRow, col, v === current ? '' : v)}
                      />
                    );
                  })}
                </div>

                {hasComment && (
                  <div className="mt-6">
                    <Textarea
                      label="კომენტარი"
                      value={values[activeRow]?.['კომენტარი'] ?? ''}
                      onChange={(e) => setCell(activeRow, 'კომენტარი', e.target.value)}
                      placeholder="შეიყვანეთ კომენტარი..."
                      rows={3}
                      autosize={false}
                      radius="md"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Footer — full width ─────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            disabled={!onBack}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <ArrowLeft size={15} />
            უკან
          </button>

          <div className="flex items-center gap-2">
            {canAddMore && (
              <button
                type="button"
                onClick={handleAddHarness}
                className="flex items-center gap-2 rounded-2xl border border-brand-500 px-4 py-2.5 text-sm font-semibold text-brand-500 transition-all hover:bg-brand-50 active:scale-95 dark:hover:bg-brand-950/30"
              >
                <Plus size={14} />
                კიდევ ერთი
              </button>
            )}
            <button
              type="button"
              onClick={onComplete}
              disabled={completing}
              className="flex min-w-[150px] items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 active:scale-95 disabled:opacity-40"
            >
              {completing ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  შენახვა და შემდეგი
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar status sub-label ─── */

function StatusLabel({
  status,
  row,
  values,
  statusCols,
}: {
  status: RowStatus;
  row: string;
  values: Record<string, Record<string, string>>;
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
      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
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

/* ─── Question row + segmented control ─── */

function QuestionRow({
  label,
  value,
  zebra,
  onSelect,
}: {
  label: string;
  value: StatusValue;
  zebra: boolean;
  onSelect: (v: StatusValue) => void;
}) {
  const handleKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'y' || k === '1') {
      e.preventDefault();
      onSelect('ok');
    } else if (k === 'n' || k === '2') {
      e.preventDefault();
      onSelect('bad');
    } else if (k === '3' || k === ' ') {
      e.preventDefault();
      onSelect('');
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKey}
      className={[
        'flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brand-500',
        zebra ? 'bg-neutral-50 dark:bg-neutral-800/40' : 'bg-transparent',
      ].join(' ')}
    >
      <span className="text-sm text-neutral-800 dark:text-neutral-200">{label}</span>
      <div className="flex shrink-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
        {STATUS_OPTIONS.map((opt, i) => {
          const selected = value === opt.value;
          let sel = 'bg-neutral-500 text-white';
          if (opt.value === 'ok') sel = 'bg-brand-500 text-white';
          else if (opt.value === 'bad') sel = 'bg-red-500 text-white';
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onSelect(opt.value as StatusValue)}
              className={[
                'h-8 w-14 text-[13px] font-medium transition-colors',
                i > 0 ? 'border-l border-neutral-200 dark:border-neutral-700' : '',
                selected
                  ? sel
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
