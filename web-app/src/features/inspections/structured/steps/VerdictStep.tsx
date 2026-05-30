/**
 * Verdict + notes step (the conclusion) for the structured wizard. Mirrors the
 * harness conclusion: a full-width SegmentedControl hero for the verdict over a
 * notes textarea. Verdict options + their tones come from the descriptor.
 */
import { Textarea } from '@/components/ui/textarea';
import { SegmentedControl } from '@/components/wizard';
import { VERDICT_GOOD, VERDICT_WARN, VERDICT_BAD, VERDICT_NEUTRAL } from '@/lib/verdictColors';
import type { ResultTone } from '@/features/inspections/equipment/components/ResultPills';
import type { WizardVerdictStep } from '../types';

const TONE_BG: Record<ResultTone, string> = {
  good: VERDICT_GOOD,
  warn: VERDICT_WARN,
  bad: VERDICT_BAD,
  neutral: VERDICT_NEUTRAL,
};

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
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{step.title}</h3>
        <p className="text-sm text-neutral-500">მიუთითეთ შემოწმების შედეგი და დასკვნა</p>
      </div>

      <div>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }} className="text-neutral-900 dark:text-neutral-100">
          დასკვნა
        </p>
        <SegmentedControl
          fullWidth
          height={48}
          fontSize={14}
          options={step.options.map((o) => ({ label: o.label, value: o.value, selectedBg: TONE_BG[o.tone] }))}
          selected={verdict}
          onSelect={(v) => { if (!disabled) onSave(step.setVerdict(v === verdict ? null : v)); }}
        />
      </div>

      <Textarea
        label={step.notesLabel ?? 'კომენტარი / დასკვნა'}
        defaultValue={notes}
        rows={4}
        disabled={disabled}
        placeholder="შეიყვანეთ დასკვნა..."
        onBlur={(e) => {
          const v = e.target.value || null;
          if (v !== (step.getNotes(model) ?? null)) onSave(step.setNotes(v));
        }}
      />
    </div>
  );
}
