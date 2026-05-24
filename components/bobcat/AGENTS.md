# bobcat

## What this module does
Bobcat-specific inspection UI pieces. Pairs with the bobcat
inspection registry entry (`lib/bobcatService.ts`) and the bobcat
route under `app/inspections/bobcat/[id].tsx`.

## Public API
- `BobcatChecklistItem` — single check row in the bobcat wizard
  (label + ✓/✗ chip + optional comment).

## Internal files
- `BobcatChecklistItem.tsx` — only export.

## Gotchas / non-obvious things
- Bobcat data lives in its own Supabase tables (`bobcat_inspections`,
  see `lib/bobcatService.ts`), NOT the generic `inspections` /
  `answers` tables. Don't try to plumb this through the generic
  `inspections-steps/InspectionShell` UI — the bobcat route owns its
  own shell.

## Canonical helpers used
- `lib/theme`, `lib/haptics`.
- `components/primitives/A11yText`, `components/inputs/FloatingLabelInput`.
