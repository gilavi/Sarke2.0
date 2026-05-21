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

const TONE_SELECTED: Record<ResultTone, string> = {
  good: 'border-emerald-600 bg-emerald-600 text-white',
  warn: 'border-amber-600 bg-amber-600 text-white',
  bad: 'border-red-600 bg-red-600 text-white',
  neutral: 'border-neutral-500 bg-neutral-500 text-white',
};

const UNSELECTED = 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400';

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
              selected ? TONE_SELECTED[option.tone] : UNSELECTED,
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
