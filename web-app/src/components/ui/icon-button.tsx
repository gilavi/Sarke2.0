import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * IconButton — the canonical icon-only button (web mirror of the mobile
 * components/primitives/IconButton). Replaces the scattered inline
 * `<button className="rounded-... p-..">` + `<Icon>` close/back controls.
 *
 * Press feel mirrors the app's bounce as closely as CSS allows: a quick squish
 * (active:scale) released through a back-out (overshoot) easing so it springs.
 */
export type IconButtonVariant = 'plain' | 'ghost' | 'danger' | 'overlay' | 'outline';
export type IconButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<IconButtonSize, { box: string; icon: number }> = {
  sm: { box: 'h-7 w-7', icon: 16 },
  md: { box: 'h-9 w-9', icon: 20 },
  lg: { box: 'h-11 w-11', icon: 22 },
};

const VARIANTS: Record<IconButtonVariant, string> = {
  plain:
    'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
  ghost:
    'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20',
  overlay: 'bg-black/55 text-white hover:bg-black/70',
  outline:
    'border border-neutral-200 text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800',
};

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Accessible label (there is no visible text). */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'plain', size = 'md', className, ...props },
  ref,
) {
  const s = SIZES[size];
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.94]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        'disabled:pointer-events-none disabled:opacity-40',
        s.box,
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      <Icon size={s.icon} strokeWidth={1.8} />
    </button>
  );
});
