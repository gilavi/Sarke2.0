import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from '@mantine/core';
import { CheckCircle2, Loader2, Plus, Pencil, ArrowRight, ArrowLeft } from 'lucide-react';
import type { Question, Answer } from '@/lib/data/inspections';

interface HarnessWizardProps {
  question: Question;
  answer?: Partial<Answer>;
  onChange: (patch: Partial<Answer>) => void;
  onComplete: () => Promise<void> | void;
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

export default function HarnessWizard({
  question,
  answer,
  onChange,
  onComplete,
  completing = false,
}: HarnessWizardProps) {
  const rows = question.grid_rows ?? [];
  const cols = question.grid_cols ?? [];
  const statusCols = cols.filter((c) => c !== 'კომენტარი');
  const hasComment = cols.includes('კომენტარი');

  const values: Record<string, Record<string, string>> = answer?.grid_values ?? {};

  const [committedRows, setCommitted] = useState<string[]>(() =>
    rows.filter((row) => statusCols.some((c) => (values[row]?.[c] ?? '') !== '')),
  );
  const [editingRow, setEditingRow] = useState<string | null>(null);

  const isEditing = editingRow !== null;
  // Key of the row the form is currently writing to
  const formKey = editingRow ?? rows[committedRows.length] ?? '';

  const formDisplayNum = isEditing
    ? committedRows.indexOf(editingRow) + 1
    : committedRows.length + 1;

  const setCell = useCallback(
    (row: string, col: string, value: string) => {
      const next = { ...values, [row]: { ...(values[row] ?? {}), [col]: value } };
      onChange({ grid_values: next });
    },
    [values, onChange],
  );

  const formHasValue = statusCols.some((c) => (values[formKey]?.[c] ?? '') !== '');

  // Commit current form row + advance to next slot
  const handleAddAnother = useCallback(() => {
    if (!formHasValue || isEditing) return;
    setCommitted((prev) => [...prev, formKey]);
  }, [formHasValue, isEditing, formKey]);

  // Commit current form (if filled) and call onComplete to advance wizard
  const handleNext = useCallback(async () => {
    if (formHasValue && !isEditing && !committedRows.includes(formKey)) {
      setCommitted((prev) => [...prev, formKey]);
    }
    await onComplete();
  }, [formHasValue, isEditing, committedRows, formKey, onComplete]);

  // Back: from edit → cancel; from new → edit last committed
  const handleBack = useCallback(() => {
    if (isEditing) {
      setEditingRow(null);
    } else if (committedRows.length > 0) {
      setEditingRow(committedRows[committedRows.length - 1]);
    }
  }, [isEditing, committedRows]);

  const handleSaveEdit = useCallback(() => setEditingRow(null), []);
  const handleEditCard = useCallback((row: string) => setEditingRow(row), []);

  const backDisabled = !isEditing && committedRows.length === 0;
  const canAddMore = !isEditing && committedRows.length < rows.length - 1 && formHasValue;
  const canProceed = !isEditing && (committedRows.length > 0 || formHasValue);

  if (rows.length === 0 || cols.length === 0) {
    return <p className="text-sm text-neutral-500">ბადის მონაცემები ვერ მოიძებნა.</p>;
  }

  return (
    <div className="flex flex-col">
      {/* ── Body: constrained to 1536px, grid so right panel never shrinks form ── */}
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-8">
        <div className="grid grid-cols-[1fr_176px] gap-5 pb-6">
          {/* LEFT: form — always occupies 1fr regardless of right panel visibility */}
          <div className="min-w-0 space-y-5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                ქამარი {formDisplayNum}
              </h3>
              {isEditing && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                  რედაქტირება
                </span>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={formKey}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="space-y-4"
              >
                {statusCols.map((col) => {
                  const current = (values[formKey]?.[col] ?? '') as StatusValue;
                  return (
                    <div key={col} className="space-y-2">
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{col}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <StatusButton
                            key={opt.value + opt.label}
                            label={opt.label}
                            selected={current === opt.value}
                            onClick={() => setCell(formKey, col, current === opt.value ? '' : opt.value)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {hasComment && (
                  <Textarea
                    label="კომენტარი"
                    value={values[formKey]?.['კომენტარი'] ?? ''}
                    onChange={(e) => setCell(formKey, 'კომენტარი', e.target.value)}
                    placeholder="შეიყვანეთ კომენტარი..."
                    rows={3}
                    autosize={false}
                    radius="md"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT: progress cards — grid column always allocated; content fades in after first commit */}
          <div>
            {committedRows.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  დამატებული
                </p>
                <AnimatePresence initial={false}>
                  {committedRows.map((row, i) => {
                    const rv = values[row] ?? {};
                    const okCount  = statusCols.filter((c) => rv[c] === 'ok').length;
                    const badCount = statusCols.filter((c) => rv[c] === 'bad').length;
                    const naCount  = statusCols.filter((c) => rv[c] === '').length;
                    const isActive = editingRow === row;
                    return (
                      <motion.div
                        key={row}
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={[
                          'rounded-xl border p-3 transition-colors',
                          isActive
                            ? 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/30'
                            : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50',
                        ].join(' ')}
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                            ქამარი {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEditCard(row)}
                            className="text-neutral-400 transition-colors hover:text-brand-500"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {okCount > 0 && (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                              {okCount} კი
                            </span>
                          )}
                          {badCount > 0 && (
                            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                              {badCount} არა
                            </span>
                          )}
                          {naCount > 0 && (
                            <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
                              {naCount} N/A
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Ghost card for in-progress harness (only when filling new) */}
                {!isEditing && committedRows.length < rows.length && (
                  <div className="rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-600">
                    <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500">
                      ქამარი {committedRows.length + 1}
                    </span>
                    <div className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-600">
                      მიმდინარეობს...
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky footer — border spans full scroll-area width; content constrained to 1536px ── */}
      <div className="sticky bottom-0 border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-6 py-4">
          {/* Left: back / cancel */}
          <button
            type="button"
            onClick={handleBack}
            disabled={backDisabled}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <ArrowLeft size={15} />
            {isEditing ? 'გამოსვლა' : 'წინა'}
          </button>

          {/* Right: contextual actions */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 active:scale-95"
              >
                <CheckCircle2 size={15} />
                შენახვა
              </button>
            ) : (
              <>
                {canAddMore && (
                  <button
                    type="button"
                    onClick={handleAddAnother}
                    className="flex items-center gap-2 rounded-2xl border border-brand-500 px-4 py-2.5 text-sm font-semibold text-brand-500 transition-all hover:bg-brand-50 active:scale-95 dark:hover:bg-brand-950/30"
                  >
                    <Plus size={14} />
                    კიდევ ერთი
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed || completing}
                  className="flex min-w-[130px] items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 active:scale-95 disabled:opacity-40"
                >
                  {completing ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      შემდეგი
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Status Button ─── */

function StatusButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  let classes = '';
  if (label === 'კი') {
    classes = selected
      ? 'bg-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-neutral-900'
      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-300';
  } else if (label === 'არა') {
    classes = selected
      ? 'bg-red-500 text-white ring-2 ring-red-500 ring-offset-2 dark:ring-offset-neutral-900'
      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-red-50 hover:text-red-600 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-300';
  } else {
    classes = selected
      ? 'bg-neutral-600 text-white ring-2 ring-neutral-500 ring-offset-2 dark:ring-offset-neutral-900'
      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-300';
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${classes}`}
    >
      {label}
    </motion.button>
  );
}
