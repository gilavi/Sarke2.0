import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * IconChip — the canonical tinted square icon chip that leads list rows,
 * section widgets and quick actions (mirrors the mobile chip-ic treatment).
 * Tone encodes the record family, not severity — status stays on StatusBadge.
 */
export type IconChipTone =
  | 'brand' // inspections
  | 'info' // briefings
  | 'warn' // incidents
  | 'danger' // reports
  | 'cert' // orders / certificates
  | 'purple' // journals
  | 'neutral';

export type IconChipSize = 'sm' | 'md' | 'lg';

const TONES: Record<IconChipTone, string> = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  cert: 'bg-amber-100/70 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
  purple: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  neutral: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
};

const SIZES: Record<IconChipSize, { box: string; icon: number }> = {
  sm: { box: 'h-7 w-7 rounded-md', icon: 15 },
  md: { box: 'h-8 w-8 rounded-lg', icon: 17 },
  lg: { box: 'h-10 w-10 rounded-lg', icon: 20 },
};

export interface IconChipProps {
  icon: LucideIcon;
  tone?: IconChipTone;
  size?: IconChipSize;
  className?: string;
}

export function IconChip({ icon: Icon, tone = 'neutral', size = 'md', className }: IconChipProps) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center', s.box, TONES[tone], className)}
    >
      <Icon size={s.icon} strokeWidth={1.8} />
    </span>
  );
}
