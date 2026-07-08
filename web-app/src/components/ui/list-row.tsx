import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { IconChip, type IconChipTone } from './icon-chip';

/**
 * ListRow — the canonical record/list row for feeds, History groups and
 * project-detail sections: leading IconChip, title + subtitle, trailing meta
 * (status pill / time), and an always-visible `actions` cluster rendered
 * OUTSIDE the navigation target so a kebab/delete tap never also navigates.
 * Never hide `actions` behind hover — touch devices have no hover.
 */
export interface ListRowProps {
  icon?: LucideIcon;
  tone?: IconChipTone;
  /** Custom leading element (avatar etc.) — overrides icon/tone. */
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  /** Trailing meta inside the press target (StatusBadge, time label). */
  trailing?: ReactNode;
  /** Action cluster outside the press target (DeleteButton, kebab). */
  actions?: ReactNode;
  /** Renders the row body as a react-router Link. */
  to?: string;
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  icon,
  tone,
  leading,
  title,
  subtitle,
  trailing,
  actions,
  to,
  onClick,
  className,
}: ListRowProps) {
  const lead = leading ?? (icon ? <IconChip icon={icon} tone={tone} size="lg" /> : null);
  const body = (
    <>
      {lead}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-[var(--text-primary)]">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-[var(--text-muted)]">{subtitle}</span>
        ) : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center gap-2">{trailing}</span> : null}
    </>
  );

  const bodyClass = cn(
    'flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left',
    (to || onClick) && 'transition-colors hover:bg-[var(--bg-hover)]',
  );

  return (
    <div className={cn('flex items-center border-t border-[var(--border-default)] first:border-t-0', className)}>
      {to ? (
        <Link to={to} className={bodyClass}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={bodyClass}>
          {body}
        </button>
      ) : (
        <div className={bodyClass}>{body}</div>
      )}
      {actions ? <div className="flex shrink-0 items-center gap-1 pr-3">{actions}</div> : null}
    </div>
  );
}
