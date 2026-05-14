import { cn } from '@/lib/utils';

interface StepBarProps {
  steps: string[];
  current: number;
  className?: string;
}

export function StepBar({ steps, current, className }: StepBarProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-[3px] flex-1 rounded-full transition-colors duration-300',
              i <= current ? 'bg-brand-500' : 'bg-neutral-200',
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-neutral-400">
        <span className="font-semibold text-brand-600">{steps[current]}</span>
        <span className="mx-1.5 text-neutral-300">·</span>
        {current + 1} / {steps.length}
      </p>
    </div>
  );
}
