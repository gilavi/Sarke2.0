import { memo, useMemo } from 'react';
import { ChecklistItemRow, type ChecklistRowOption } from './ChecklistItemRow';

export interface ChecklistItemOptions {
  a: string;           // good — "კარგი" / "კი" / "აკმაყოფილებს" / "✓"
  b: string;           // deficient (three_state) / fail (binary) / critical (four_state)
  c?: string;          // optional 3rd — "N/A" / minor
  cIsNeutral?: boolean; // text (N/A) chip when true (three_state)
  d?: string;          // optional 4th (four_state) — neutral "not checked"
}

export interface ChecklistItemProps {
  id: number;
  label: string;
  description?: string;
  type?: 'three_state' | 'binary' | 'four_state'; // default 'three_state'
  options: ChecklistItemOptions;
  value: string | null;
  onChange: (value: string | null) => void;
  // ── Legacy props (per-row notes/photos removed app-wide). Accepted so existing
  //    callers keep compiling; ignored. ──
  comment?: string;
  onCommentChange?: (text: string) => void;
  photoPaths?: string[];
  onAddPhoto?: () => void;
  onDeletePhoto?: (path: string) => void;
  showAccordion?: boolean;
}

/**
 * One equipment checklist item. Thin adapter over the shared monochrome
 * {@link ChecklistItemRow}: maps the 2–4 state vocabulary (binary / three_state
 * / four_state, incl. N/A) to result chips — good is a ✓, deficient a ⚠, fail a
 * ✗, and N/A-style states render as a short text chip. No per-row note/photo;
 * the `result` still drives the PDF pills, counts, and verdict.
 */
export const ChecklistItem = memo(function ChecklistItem({
  label,
  description,
  type = 'three_state',
  options,
  value,
  onChange,
}: ChecklistItemProps) {
  const rowOptions = useMemo(
    () => buildOptions(type, options, label),
    [type, options, label],
  );
  return (
    <ChecklistItemRow
      label={label}
      description={description}
      options={rowOptions}
      value={value}
      onChange={onChange}
      dense
    />
  );
});

function buildOptions(
  type: 'three_state' | 'binary' | 'four_state',
  options: ChecklistItemOptions,
  label: string,
): ChecklistRowOption[] {
  const mk = (value: string, extra: Partial<ChecklistRowOption>): ChecklistRowOption => ({
    value,
    a11yLabel: `${label} — ${value}`,
    ...extra,
  });
  const out: ChecklistRowOption[] = [mk(options.a, { icon: 'checkmark' })];

  if (type === 'binary') {
    out.push(mk(options.b, { icon: 'close' }));
  } else if (type === 'four_state') {
    // a=good (icon), b=critical, c=minor, d=not-checked — severity short labels.
    out.push(mk(options.b, { shortLabel: options.b }));
    if (options.c) out.push(mk(options.c, { shortLabel: options.c }));
    if (options.d) out.push(mk(options.d, { shortLabel: options.d }));
  } else {
    // three_state: a=good, b=deficient (⚠), c=N/A (text) or fail (✗).
    out.push(mk(options.b, { icon: 'warning-outline' }));
    if (options.c) {
      out.push(
        options.cIsNeutral
          ? mk(options.c, { shortLabel: options.c.length <= 3 ? options.c : 'N/A' })
          : mk(options.c, { icon: 'close' }),
      );
    }
  }
  return out;
}
