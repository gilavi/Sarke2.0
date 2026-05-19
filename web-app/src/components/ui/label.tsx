import { forwardRef, type LabelHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// We use a plain <label> styled with Mantine-compatible sizing/weight
// to avoid Mantine Text's incomplete HTML attribute type coverage.
export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children?: ReactNode;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1', className)}
      {...props}
    >
      {children}
    </label>
  ),
);
Label.displayName = 'Label';
