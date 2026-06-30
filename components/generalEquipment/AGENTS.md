# generalEquipment

## What this module does
General-equipment inspection UI (anything that doesn't fit one of the
specific equipment types: bobcat, excavator, cargo platform, etc.).
Pairs with `lib/generalEquipmentService.ts` and the route under
`app/inspections/general-equipment/[id].tsx`.

## Public API
- `EquipmentRow` — report-style card for one equipment item in the
  wizard's equipment step (step 2).

## Internal files
- `EquipmentRow.tsx` — only export.

## Gotchas / non-obvious things
- "General equipment" is the open-ended category — used when the
  inspector picks an equipment type that doesn't have its own
  schema-specialised flow.
- **Report-style card, not a questionnaire row.** Collapsed state is
  just name + 3 monochrome status chips (good / needs-service /
  unusable). Picking `needs_service` or `unusable` expands an accordion
  with a **photo strip first, then a comment** field (image → comment).
  "Good" rows stay collapsed. The comment is required on flagged rows —
  enforced by `validateMissing` in the route, not by `canGoNext`.
- Photo upload/delete and every field write are delegated to the route
  via `onChange` / `onAddPhoto` / `onDeletePhoto`; the component holds
  only local input drafts. Per-row photos go to the `answer-photos`
  bucket under `<inspId>/equipment/<rowId>` via
  `generalEquipmentApi.uploadPhoto(id, 'equipment', rowId, uri)`.
- `EquipmentItem` still carries `model` / `serialNumber`, but the card
  intentionally does **not** surface inputs for them (they were dropped
  from the redesigned step). They remain in the type/PDF/result mapping
  and are simply left blank by the wizard.
- This card replaced the earlier `ChecklistItemRow` (name + toggle only,
  no per-row note/photo) that briefly shipped in the step. Before that
  swap, flagged rows had no way to enter the note `validateMissing`
  required — so the card also closes that gap.

## Canonical helpers used
- `lib/theme`.
- `components/primitives/A11yText`, `components/inputs/FloatingLabelInput`,
  `components/SuggestionPills`.
- `hooks/useFieldHistory` (name suggestions), `lib/imageUrl` +
  `STORAGE_BUCKETS.answerPhotos` (photo thumbnails).
