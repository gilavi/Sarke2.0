import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Step {
  label: string;
}

interface Props {
  steps: Step[];
  current: number;
  onStep: (n: number) => void;
}

export default function WizardSteps({ steps, current, onStep }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-1">
      {steps.map((step, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onStep(i)}
          className={`flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${
            i === current
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <span className="mr-1.5 text-xs opacity-70">{i + 1}.</span>
          {step.label}
        </button>
      ))}
    </div>
  );
}

export function WizardNav({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex justify-between pt-2">
      <Button variant="outline" size="sm" onClick={onPrev} disabled={current === 0}>
        <ChevronLeft size={14} className="mr-1" />
        უკან
      </Button>
      <Button variant="outline" size="sm" onClick={onNext} disabled={current === total - 1}>
        წინ
        <ChevronRight size={14} className="ml-1" />
      </Button>
    </div>
  );
}
