# inspection-parts

## What this module does
Small, reusable UI pieces used across the generic inspection flows
and the order-new wizard. Previously named `components/inspection/`;
renamed in Phase 1 of the refactor to distinguish from
`components/inspection-steps/` (the bigger wizard step shells).

## Public API (from index.ts)
- `ChecklistItem` — yes/no row used in checklist sections.
- `ChecklistSection` — a labelled group of `ChecklistItem`s.
- `DynamicTable` — small data table for read-only summaries.
- `IdentificationGrid` — 2-col label/value grid for inspection
  identification headers.
- `PhotoSection` — horizontal photo strip + "+" tile.
- `QualDoc` — qualification document (16:9 photo placeholder + add /
  delete controls). Used by `features/order-new` and qualification
  uploads.
- `SignatureBlock` — single-signature display block.
- `SignatureSheet` — bottom-sheet container for capturing a signature.
- `VerdictSelector` — three-way verdict button group.

## Internal files
One file per export above, plus `index.ts`.

## Gotchas / non-obvious things
- `inspection-parts` (this folder) is the small pieces.
  `inspection-steps` is the big wizard step shells. Don't mix the
  two — keep step shells in `inspection-steps/`, atoms here.

## Canonical helpers used
- `lib/theme`, `lib/accessibility`.
- `components/primitives` — Button, Card, A11yText.
- `components/SignatureCanvas` (for SignatureSheet).
