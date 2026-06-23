# inspection-parts

## What this module does
Small, reusable UI pieces used across the generic inspection flows
and the order-new wizard. Previously named `components/inspection/`;
renamed in Phase 1 of the refactor to distinguish from
`components/inspection-steps/` (the bigger wizard step shells).

## Public API (from index.ts)
- `ChipNavStrip` — horizontal secondary-navigation chip strip for flows
  that step through repeated indexed sub-items (fall-protection devices,
  harnesses). Props: `items` (`{key,label,state}[]` where state is
  `pending|active|done|problem|warning`), `activeIndex`, `onSelect`.
  Used by `app/inspections/fall-protection` and
  `components/harness-list/HarnessListFlow`.
- `ChecklistItemRow` — **canonical checklist row** for any "several
  items on one page" list: label + inline help `?` + a cluster of
  monochrome `StatusChip`s (2–4 options incl. N/A). Neutral by default,
  no per-row note/photo. Harness `ChipRow`, equipment `ChecklistRow`,
  and `ChecklistItem` are all thin adapters over it. `dense` for 3–4
  options; `labelLines` (default 2) raises the label truncation cap for
  long item labels (fall-protection passes 4 so its sentence-length
  parameters wrap instead of clipping with `…`).
- `ChecklistLegend` — monochrome key (filled chip glyph + Georgian
  label) shown above a `ChecklistItemRow` list.
- `ChecklistItem` — thin adapter over `ChecklistItemRow`: maps the 2–4
  state vocabulary (binary / three_state / four_state, incl. N/A) to
  result chips. Legacy comment/photo props are accepted but ignored.
- `ChecklistSection` — a labelled group of `ChecklistItem`s.
- `DynamicTable` — repeated bordered row-cards (add/delete) for small
  registries (fall-protection devices, cargo, removed accessories,
  load-test rows). Delete is a red `Trash2` `IconButton`. By default the
  card header is an ordinal `#n` badge; pass `titleColumnKey` to instead
  show that column's value (e.g. `N1`) as the card title and drop it from
  the field list — so a row that already carries a display id doesn't
  render both a `#1` badge and a readonly `ID: N1` cell.
- `IdentificationGrid` — label/value grid for inspection identification
  headers. `columns={1|2}` (use `1` to stack inputs one-per-row). Field
  `type`: `'text' | 'number' | 'chips' | 'select'`. `'select'` renders a
  full-width inline list of selectable option rows (radio-style) for
  single-select "type" pickers; `'chips'` stays for status/result pills.
- `PhotoSection` — horizontal photo strip + "+" tile.
- `QualDoc` — qualification document (16:9 photo placeholder + add /
  delete controls). Used by `features/order-new` and qualification
  uploads.
- `SignatureBlock` — single-signature display block.
- `SignatureSheet` — bottom-sheet container for capturing a signature.
- (`VerdictSelector` was **removed** — the canonical verdict picker now
  lives in [`components/inspection-steps/VerdictSelector.tsx`](../inspection-steps/VerdictSelector.tsx)
  and is consumed via the shared `ConclusionStep`.)

## Internal files
One file per export above, plus `index.ts`. `ChipNavStrip` renders its mapped
chips via `NavChip.tsx` (extracted so each chip owns its press/selection animated
values; the parent computes per-chip colors and passes them down).

## Gotchas / non-obvious things
- `inspection-parts` (this folder) is the small pieces.
  `inspection-steps` is the big wizard step shells. Don't mix the
  two — keep step shells in `inspection-steps/`, atoms here.
- `ChipNavStrip` chips carry the canonical press squish ([`PressBounce`](../animations/PressBounce.tsx)
  via `NavChip`) + a 150ms pill border/fill tween; the `done` checkmark springs in via
  [`useSelectionPop`](../animations/useSelectionPop.ts). The status dot stays instant. Honours reduce-motion.

## Canonical helpers used
- `lib/theme`, `lib/accessibility`.
- `components/primitives` — Button, Card, A11yText.
- `components/SignatureCanvas` (for SignatureSheet).
