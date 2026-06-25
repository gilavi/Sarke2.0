/**
 * Shared 3-state status control — the AUDIT LEDGER "seg" pill.
 *
 * One segmented control: the options are joined into a single pill with hairline
 * dividers between segments. State is read by which segment is filled + its label
 * — NOT by colour. Selection is MONOCHROME (solid ink fill + inverted, slightly
 * heavier text), matching the mobile app's StatusChip. No green/red/amber/grey
 * status colours anywhere.
 *
 *  - Selected segment: solid ink (var(--text-primary)) fill, white/inverted text
 *    (var(--bg-card)), weight 600.
 *  - Unselected segment: transparent, muted-grey label (var(--text-secondary)),
 *    subtle hover (faint fill + label darkens to var(--text-primary)).
 *  - "N/A" labels render in font-mono (detected by exact label match); Georgian
 *    labels stay in the normal UI font. No wrapping — each option is one line.
 *
 * `selectedBg` is retained on the type for callers but never tints selection.
 */
import { useState } from 'react';

export interface SegOption {
  label: string;
  value: string;
  /** @deprecated kept for callers; selection is monochrome ink now. */
  selectedBg?: string;
}

/** N/A-style labels render in the mono stack; Georgian labels stay in sans. */
function isMono(label: string) {
  return /^n\/?a$/i.test(label.trim());
}

export function SegmentedControl({
  options,
  selected,
  onSelect,
  fullWidth = false,
  height = 34,
  fontSize = 13,
}: {
  options: SegOption[];
  /** The selected option value, or null when nothing is selected. */
  selected: string | null;
  onSelect: (value: string) => void;
  /** When true, options stretch to fill the row (used for the verdict). */
  fullWidth?: boolean;
  /** Control height - defaults to the 34px checklist size. */
  height?: number;
  fontSize?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      className={fullWidth ? 'flex w-full overflow-hidden' : 'flex shrink-0 overflow-hidden'}
      style={{ borderRadius: 8, border: '1px solid var(--border-default)' }}
      role="group"
    >
      {options.map((o, i) => {
        const isSel = selected === o.value;
        const isHover = !isSel && hovered === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            onMouseEnter={() => setHovered(o.value)}
            onMouseLeave={() => setHovered((h) => (h === o.value ? null : h))}
            aria-pressed={isSel}
            className={[
              'whitespace-nowrap leading-none outline-none',
              'focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-brand-500',
              isMono(o.label) ? 'font-mono' : '',
            ].join(' ')}
            style={{
              height,
              fontSize,
              flex: fullWidth ? 1 : undefined,
              width: fullWidth ? undefined : 56,
              paddingLeft: fullWidth ? undefined : 4,
              paddingRight: fullWidth ? undefined : 4,
              borderLeft: i > 0 ? '1px solid var(--border-default)' : undefined,
              // Monochrome ink selection (flips with theme via the vars).
              background: isSel
                ? 'var(--text-primary)'
                : isHover
                  ? 'var(--bg-hover)'
                  : 'transparent',
              color: isSel
                ? 'var(--bg-card)'
                : isHover
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              fontWeight: isSel ? 600 : 500,
              transition: 'background-color 0.18s ease, color 0.18s ease',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
