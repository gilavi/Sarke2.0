import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * QuickActionsRow — the mobile-parity row of circular creation verbs
 * (შემოწმება, ბრძანება, …) shown on Home and on a project page. Each action
 * is a labeled 52px disc; tone matches the record family (see IconChip).
 * Only render verbs that actually have a working flow — no dead buttons.
 */
export interface QuickActionDef {
  key: string;
  label: string;
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
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {actions.map(({ key, label, icon: Icon, tone, onClick }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          className="group flex w-[84px] flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <span
            className={cn(
              'flex h-[52px] w-[52px] items-center justify-center rounded-full transition-transform group-active:scale-95',
              DISC_TONES[tone],
            )}
          >
            <Icon size={22} strokeWidth={1.8} />
          </span>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
        </button>
      ))}
    </div>
  );
}
