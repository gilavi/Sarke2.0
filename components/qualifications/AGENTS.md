# qualifications

## What this module does
UI specific to the inspector's qualifications (xaracho_inspector,
harness_inspector, etc.). Currently just the "add qualification"
bottom sheet — the listing UI lives at `app/qualifications/index.tsx`.

## Public API
- `AddQualificationSheet` — bottom sheet capturing the cert
  type / number / issue date / expiry date / photo and emitting a
  `Qualification` to the caller.

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
