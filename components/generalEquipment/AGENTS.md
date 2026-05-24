# generalEquipment

## What this module does
General-equipment inspection UI (anything that doesn't fit one of the
specific equipment types: bobcat, excavator, cargo platform, etc.).
Pairs with `lib/generalEquipmentService.ts` and the route under
`app/inspections/general-equipment/[id].tsx`.

## Public API
- `EquipmentRow` — single row in the general-equipment table.

## Internal files
- `EquipmentRow.tsx` — only export.

## Gotchas / non-obvious things
- "General equipment" is the open-ended category — used when the
  inspector picks an equipment type that doesn't have its own
  schema-specialised flow.

## Canonical helpers used
- `lib/theme`.
- `components/primitives/A11yText`, `components/inputs/FloatingLabelInput`.
