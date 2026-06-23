/**
 * The result-selector pill row used on every equipment checklist item
 * (good / deficient / unusable, good / fix / na, good / needs_service /
 * unusable, …). Previously copy-pasted with hard-coded emerald/amber/red
 * classes in all four detail pages; now driven by `tone` so each type maps its
 * own enum onto the shared visual language. Clicking the selected pill
 * deselects it (toggles back to null).
 */
import { cn } from '@/lib/utils';

export type ResultTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface ResultOption<V extends string> {
  value: V;
  label: string;
  tone: ResultTone;
}

// Monochrome selection (ink fill); the label carries the meaning, not colour —
// matching the mobile StatusChip and the rest of the answer surfaces.
const SELECTED =
  'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900';

const UNSELECTED =
  'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-brand-500';

interface ResultPillsProps<V extends string> {
  options: ResultOption<V>[];
  value: V | null;
  disabled?: boolean;
  onSelect: (value: V | null) => void;
}

export function ResultPills<V extends string>({
  options,
  value,
  disabled,
  onSelect,
}: ResultPillsProps<V>) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(selected ? null : option.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition',
              selected ? SELECTED : UNSELECTED,
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
