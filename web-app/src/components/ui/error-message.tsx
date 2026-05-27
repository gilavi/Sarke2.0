import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  children: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function ErrorMessage({ children, compact, className }: ErrorMessageProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-red-200 bg-red-50 text-sm text-red-700',
        'dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
        compact ? 'px-3 py-2' : 'px-4 py-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
