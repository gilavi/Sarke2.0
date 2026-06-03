import { cn } from '@/lib/utils';

/**
 * Hubble brand pattern system — the "orbital paths" motif from the brand board
 * (the mark is inspired by orbital paths; the name echoes the telescope). These
 * are decorative, `aria-hidden`, and positioned absolutely by the caller.
 *
 * - `OrbitRings` — concentric rings + orbiting bodies (orange / hi-vis dots).
 *   Rings use `currentColor` so the caller tints them (graphite/10 on light,
 *   white/10 on dark); the orbiting dots are fixed brand accents.
 * - `DotGrid` — the board's dot-grid texture, `currentColor`.
 * - `HazardSticker` / `RoundSticker` — die-cut "sticker system" badges.
 */

export function OrbitRings({ className, dotted = false }: { className?: string; dotted?: boolean }) {
  return (
    <svg viewBox="0 0 480 480" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.5">
        <circle cx="240" cy="240" r="62" opacity="0.9" />
        <circle cx="240" cy="240" r="118" opacity="0.6" />
        <circle cx="240" cy="240" r="178" opacity="0.4" strokeDasharray={dotted ? '2 9' : undefined} />
        <circle cx="240" cy="240" r="232" opacity="0.22" />
      </g>
      {/* orbiting bodies — fixed brand accents */}
      <circle cx="240" cy="122" r="9" fill="#FF5A1F" />
      <circle cx="418" cy="240" r="6" fill="#E6FF4D" />
      <circle cx="178" cy="240" r="4.5" fill="currentColor" opacity="0.55" />
      <circle cx="240" cy="58" r="4" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export function DotGrid({ className, id = 'hubble-dotgrid' }: { className?: string; id?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={id} width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="1.6" cy="1.6" r="1.6" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Hi-vis hazard triangle — the board's "HAZARD" sticker, icon-only. */
export function HazardSticker({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 104 96" className={cn('select-none', className)} aria-hidden="true">
      <path
        d="M52 6 L98 84 Q102 92 92 92 H12 Q2 92 6 84 Z"
        fill="#E6FF4D" stroke="#161614" strokeWidth="5" strokeLinejoin="round"
      />
      <rect x="47" y="34" width="10" height="30" rx="5" fill="#161614" />
      <circle cx="52" cy="76" r="6" fill="#161614" />
    </svg>
  );
}

/**
 * Round die-cut badge — graphite ring + bold centered label, slightly rotated.
 * `tone="orange"` flips it to a safety-orange fill with white ink.
 */
export function RoundSticker({ label, tone = 'light', className }: { label: string; tone?: 'light' | 'orange'; className?: string }) {
  const orange = tone === 'orange';
  return (
    <div
      className={cn(
        'flex aspect-square items-center justify-center rounded-full border-2 text-center leading-tight select-none',
        orange ? 'border-graphite-900 bg-safety-500 text-white' : 'border-graphite-900 bg-hivis text-graphite-900',
        className,
      )}
    >
      <span className="px-2 text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
  );
}
