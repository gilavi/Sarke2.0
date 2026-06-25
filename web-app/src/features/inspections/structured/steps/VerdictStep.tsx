/**
 * Verdict + notes step (the conclusion) for the structured wizard. The verdict
 * options render as a stack of large full-width selectable cards over a notes
 * textarea. Selection is MONOCHROME ink (solid fill + inverted text, matching
 * the SegmentedControl / StatusChip direction — no green/red/amber status
 * colour). Verdict options come from the descriptor.
 *
 * The step heading ("დასკვნა") lives ONLY in the wizard stepper — the body
 * carries no duplicate title or label, just a one-line instruction.
 */
import { Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { WizardVerdictStep } from '../types';

interface Props<T, P> {
  step: WizardVerdictStep<T, P>;
  model: T;
  disabled: boolean;
  onSave: (patch: P) => void;
}

export function VerdictStep<T, P>({ step, model, disabled, onSave }: Props<T, P>) {
  const verdict = step.getVerdict(model);
  const notes = step.getNotes(model) ?? '';
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">მიუთითეთ შემოწმების შედეგი</p>

      <div className="flex flex-col gap-3">
        {step.options.map((o) => {
          const selected = verdict === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => { if (!disabled) onSave(step.setVerdict(o.value === verdict ? null : o.value)); }}
              className={[
                'flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left',
                'outline-none transition-all focus-visible:ring-2 focus-visible:ring-brand-500',
                'disabled:cursor-not-allowed disabled:opacity-60',
                selected
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800',
              ].join(' ')}
            >
              <span className="text-base font-semibold">{o.label}</span>
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all',
                  selected
                    ? 'border-white bg-white text-neutral-900 dark:border-neutral-900 dark:bg-neutral-900 dark:text-neutral-100'
                    : 'border-neutral-300 text-transparent dark:border-neutral-600',
                ].join(' ')}
              >
                <Check size={14} strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>

      <Textarea
        label={step.notesLabel ?? 'კომენტარი'}
        defaultValue={notes}
        rows={4}
        disabled={disabled}
        placeholder="შეიყვანეთ კომენტარი..."
        onBlur={(e) => {
          const v = e.target.value || null;
          if (v !== (step.getNotes(model) ?? null)) onSave(step.setNotes(v));
        }}
      />
    </div>
  );
}
