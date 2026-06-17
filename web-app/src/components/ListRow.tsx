import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
type LucideIcon = ComponentType<LucideProps>;
import { cn } from '@/lib/utils';

interface ListRowProps {
  to: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: string;
  badge?: React.ReactNode;
  className?: string;
}

export function ListRow({ to, icon, title, subtitle, trailing, badge, className }: ListRowProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 px-6 py-4',
        'border-b border-neutral-100 last:border-0',
        'transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60',
        className,
      )}
    >
      {icon && <div className="shrink-0">{icon}</div>}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
        {subtitle && (
          <p className="mt-0.5 truncate text-[12px] text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {trailing && (
          <span className="text-[12px] text-neutral-400">{trailing}</span>
        )}
        {badge}
        <ChevronRight size={16} className="text-neutral-300" />
      </div>
    </Link>
  );
}

/** Icon slot for list rows - circle with a Lucide icon inside */
export function ListRowIcon({
  icon: Icon,
  color = 'bg-neutral-100',
  iconColor = 'text-neutral-500',
}: {
  icon: LucideIcon;
  color?: string;
  iconColor?: string;
}) {
  return (
    <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', color)}>
      <Icon size={16} className={iconColor} />
    </div>
  );
}
