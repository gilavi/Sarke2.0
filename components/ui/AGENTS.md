# ui

## What this module does
Backwards-compatible barrel for the legacy "ui" import path.
Re-exports the canonical primitives from `components/primitives/`
plus a small set of legacy helpers that were inlined in
`components/ui.tsx` before Phase 1 of the refactor.

Most call sites still do `from '../../components/ui'` — this folder
keeps them working.

## Public API (from index.ts)
Re-exported from `../primitives`:
- `Button`, `Card`, `Input`, `Badge`, `Screen`, `A11yText`,
  `ActionSheetItem`.

Re-exported from sibling components:
- `SectionHeader as SectionHeaderNew` (the modernised section
  header). The legacy one — `SectionHeader` — is still defined here
  in `SectionHeaderLegacy.tsx` for old call sites.
- `FormField`, `ButtonGroup`, `ActionSheet`.

Local legacy helpers (split from the original `components/ui.tsx`):
- `Label.tsx`, `Field.tsx`, `Chip.tsx`, `SectionHeaderLegacy.tsx`,
  `ErrorText.tsx` — all themed via `useTheme()`.
- `CustomDropdown.tsx` — single-/multi-select dropdown with
  bottom-sheet behaviour.

## Internal files
One file per export above, plus `index.ts`. `Selector` splits its mapped
options into `SelectorOption.tsx` (`SelectorOptionChip` + `SelectorOptionRow`
+ `SelectorOptionCard`) so each option can own its own press/selection
animated values.

## Gotchas / non-obvious things
- `Selector` options carry the canonical press squish ([`PressBounce`](../animations/PressBounce.tsx))
  + a selection spring-in ([`useSelectionPop`](../animations/useSelectionPop.ts)) + a 150ms
  border/fill tween. The per-option shared values live in `SelectorOption.tsx` (a `.map()` can't
  call hooks); the parent passes `styles`/`theme` down. `CustomDropdown`'s trigger uses `PressBounce`.
- `Selector presentation="grid"` is the 2-column illustration-card picker
  (`SelectorOptionCard`): each option supplies a big `leading` (e.g.
  `InspectionTypeAvatar transparent`) + label below. Selection is monochrome
  — an ink border + a **low-alpha ink fill** (`withOpacity(ink, 0.06)`), so
  the card keeps its surface and is gently tinted, never a solid grey block.
  Used by `TemplatePickerStep` (the inspection-type first step).
- `SectionHeader` (legacy here) and `SectionHeaderNew` (the newer
  modular header at `components/SectionHeader.tsx`) coexist. New
  call sites should import `SectionHeaderNew` (or the newer
  `components/SectionHeader` directly).
- `Chip`/`Label`/`Field`/`ErrorText` survive only for old call sites;
  prefer the primitive equivalents (`Badge`, the floating-label
  inputs, etc.) in new code.
- `components/ui.tsx` no longer exists. The `from '../../components/ui'`
  path resolves to `components/ui/index.ts` because of folder
  resolution.

## Canonical helpers used
- `lib/theme`.
- `components/primitives/*` for the re-exports.
