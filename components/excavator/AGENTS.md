# excavator

## What this module does
Excavator-specific inspection UI. Pairs with `lib/excavatorService.ts`
and the route under `app/inspections/excavator/[id].tsx`.

## Public API
- `ExcavatorChecklistItem` — single check row.
- `ExcavatorMaintenanceItem` — maintenance-section row (separate
  layout from the standard checklist row).

## Internal files
- `ExcavatorChecklistItem.tsx`, `ExcavatorMaintenanceItem.tsx`.

## Gotchas / non-obvious things
- Excavator inspections are owned by `lib/excavatorService.ts`, not
  the generic answer-row pipeline.

## Canonical helpers used
- `lib/theme`, `lib/haptics`.
- `components/primitives/A11yText`, `components/inputs/FloatingLabelInput`.
