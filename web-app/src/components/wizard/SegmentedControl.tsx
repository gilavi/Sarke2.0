/**
 * Shared segmented control used by the checklist rows (3 options) and the
 * conclusion verdict (2 options). All options render identically when
 * unselected (#F5F4F1 / #6B7280) — none ever looks "default selected".
 */
export interface SegOption {
  label: string;
  value: string;
  selectedBg: string;
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
  /** Control height — defaults to the 34px checklist size. */
  height?: number;
  fontSize?: number;
}) {
  return (
    <div
      className={fullWidth ? 'flex w-full overflow-hidden' : 'flex shrink-0 overflow-hidden'}
      style={{ borderRadius: 8, border: '1px solid var(--border-default)' }}
    >
      {options.map((o, i) => {
        const isSel = selected === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            style={{
              height,
              fontSize,
              fontWeight: 500,
              flex: fullWidth ? 1 : undefined,
              width: fullWidth ? undefined : 56,
              borderLeft: i > 0 ? '1px solid var(--border-default)' : undefined,
              background: isSel ? o.selectedBg : 'var(--bg-hover)',
              color: isSel ? '#fff' : 'var(--text-secondary)',
              transition: 'background-color 0.12s, color 0.12s',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
