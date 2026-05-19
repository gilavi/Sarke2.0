import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Styled native <input> that matches Mantine's visual language.
// Using native element keeps full HTML attribute coverage (type, value, onChange, etc.)
export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-[var(--mantine-color-default-border,#ced4da)]',
        'bg-[var(--mantine-color-body,#fff)] px-3 py-2 text-sm',
        'text-[var(--mantine-color-text,#1a1a1a)]',
        'placeholder:text-neutral-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0 focus-visible:border-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
