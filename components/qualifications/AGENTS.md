# qualifications

## What this module does
UI specific to the inspector's qualifications (xaracho_inspector,
harness_inspector, etc.). Currently just the "add qualification"
bottom sheet — the listing UI lives at `app/qualifications/index.tsx`.

The listing screen renders its own header (`HeaderBackButton` + centered
title, `Stack` header hidden) and a 2-column thumbnail **grid**: a "სხვა
ნებისმიერი სერტიფიკატი" row on top opens the add sheet for an arbitrary
cert (`general` type); each `REQUIRED_TYPES` slot is either a dashed empty
upload card or a filled card showing the document thumbnail with
edit (→ `AddQualificationSheet existing`) + delete overlay actions.
Additional (non-required) quals are appended to the grid.

## Public API
- `AddQualificationSheet` — bottom sheet capturing the cert
  type / number / issue date / expiry date / photo and emitting a
  `Qualification` to the caller. Pass `existing` to edit a row in
  place (the sheet prefills from it and reuses its `id`, so the
  upsert replaces rather than inserts; keeps the old `file_url`
  when no new photo is picked).

## Internal files
- `AddQualificationSheet.tsx`.

## Gotchas / non-obvious things
- Qualifications are persisted via `lib/services/qualificationsApi`
  (`qualifications` table) — distinct from the `certificates` table
  (the generated PDFs) and the `inspection_attachments` table (the
  per-inspection equipment cert photos).

## Canonical helpers used
- `lib/services` — `qualificationsApi`.
- `lib/theme`, `lib/qualificationTypes`.
- `components/BottomSheet`, `components/DateTimeField`,
  `components/inputs/FloatingLabelInput`,
  `components/inspection-parts` — `QualDoc`.
