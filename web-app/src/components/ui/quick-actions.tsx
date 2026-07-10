import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * QuickActionsRow — the creation verbs (შემოწმება, ბრძანება, …) shown on Home
 * and on a project page. Web-sized cards (vs mobile's small discs) that keep
 * the mobile icon + tone per record family. Only render verbs that actually
 * have a working flow — no dead buttons.
 */
export interface QuickActionDef {
  key: string;
  label: string;
  /** One-line explanation under the label, e.g. "ახალი შემოწმების აქტი". */
  description?: string;
  icon: LucideIcon;
  tone: 'brand' | 'info' | 'warn' | 'danger' | 'cert';
  onClick: () => void;
}

const DISC_TONES: Record<QuickActionDef['tone'], string> = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  cert: 'bg-amber-100/70 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
};

export function QuickActionsRow({ actions, className }: { actions: QuickActionDef[]; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {actions.map(({ key, label, description, icon: Icon, tone, onClick }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          className={cn(
            'group flex items-center gap-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-left',
            'transition-colors hover:border-[var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          )}
        >
          <span
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform group-active:scale-95',
              DISC_TONES[tone],
            )}
          >
            <Icon size={23} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold text-[var(--text-primary)]">{label}</span>
            {description ? (
              <span className="block truncate text-xs text-[var(--text-muted)]">{description}</span>
            ) : null}
          </span>
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-muted)] transition-colors group-hover:border-brand-500 group-hover:text-brand-600"
          >
            <Plus size={15} strokeWidth={2} />
          </span>
        </button>
      ))}
    </div>
  );
}
