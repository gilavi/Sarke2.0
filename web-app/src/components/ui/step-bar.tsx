import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepBarProps {
  steps: string[];
  current: number;
  className?: string;
}

export function StepBar({ steps, current, className }: StepBarProps) {
  return (
    <div className={cn('flex items-start', className)}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  done || active
                    ? 'bg-brand-500 text-white'
                    : 'bg-neutral-100 text-neutral-400',
                )}
              >
                {done ? <Check size={14} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={cn(
                  'whitespace-nowrap text-[11px]',
                  done || active ? 'font-medium text-neutral-700' : 'text-neutral-400',
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'mt-[15px] h-[2px] flex-1 rounded-full transition-colors',
                  i < current ? 'bg-brand-500' : 'bg-neutral-200',
                )}
                style={{ minWidth: 20, margin: '15px 6px 0' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
