import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SectionHeader — the canonical heading above a card/list section:
 * title + muted count + an optional trailing action (link or button).
 * Replaces per-page inline `flex items-baseline` header rows.
 */
export interface SectionHeaderProps {
  title: string;
  count?: number;
  /** Trailing link ("ყველა" → History etc.). */
  to?: string;
  linkLabel?: string;
  /** Or a custom trailing element (e.g. an add Button). */
  trailing?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, count, to, linkLabel, trailing, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-2.5 mt-7 flex items-baseline gap-2', className)}>
      <h2 className="text-sm font-bold text-[var(--text-primary)]">{title}</h2>
      {typeof count === 'number' ? (
        <span className="text-xs tabular-nums text-[var(--text-muted)]">{count}</span>
      ) : null}
      <span className="flex-1" />
      {trailing}
      {to ? (
        <Link
          to={to}
          className="inline-flex items-center gap-0.5 rounded-md text-[13px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          {linkLabel ?? 'ყველა'}
          <ChevronRight size={14} strokeWidth={2} />
        </Link>
      ) : null}
    </div>
  );
}
