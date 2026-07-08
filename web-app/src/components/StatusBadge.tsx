import { cn } from '@/lib/utils';

type Status = 'draft' | 'completed' | 'in_progress' | 'overdue' | 'due_today' | 'upcoming' | string;

/**
 * StatusBadge — plain span pill (no Mantine) with the canonical Georgian
 * status labels. Tones: green = done, amber = still open, red = overdue.
 */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed:   { label: 'დასრულდა',   className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  draft:       { label: 'დრაფტი',     className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  in_progress: { label: 'მიმდინარე',  className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  overdue:     { label: 'ვადაგასული', className: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  due_today:   { label: 'დღეს',       className: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' },
  upcoming:    { label: 'დაგეგმილი',  className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-300' },
};

const FALLBACK_CLASS = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-300';

export default function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: FALLBACK_CLASS };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
