import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Canonical empty state. Previously each list page (Home, History, Calendar,
 * Certificates) hand-rolled its own with different padding (py-12 vs py-16),
 * icon sizes (22/24/32), and dark surfaces (neutral-800 vs 900). One component,
 * one set of defaults.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900',
        className,
      )}
    >
      <Icon size={32} className="text-neutral-300 dark:text-neutral-600" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
        {hint && <p className="text-xs text-neutral-400 dark:text-neutral-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
