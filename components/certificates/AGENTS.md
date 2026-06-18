# certificates

## What this module does
Equipment-certificate management for one inspection (the type chip +
optional №number + optional 16:9 photo rows that get embedded into the
generated PDF). Rendered as a **real pushed screen** at
`app/inspections/[id]/certificates.tsx` — it replaced the former modal
`CertificatesActionSheet`, whose modal nesting broke the photo picker
(native picker over an already-presented RN Modal silently failed),
hid the Save button under the keyboard, and used a one-off back button.

## Public API
- `CertificatesManager` — full-screen orchestrator. Two state-driven
  views: `list` (rows + add CTA) and `edit` (`CertEditForm`). Props:
  `inspectionId`, `onClose` (router.back). Each successful save/delete
  calls `markCertsDirty(inspectionId)` so the inspection-result screen
  rebuilds its live PDF preview on focus return.
- `CertEditForm` — add/edit one attachment. Uses the canonical
  `/photo-picker` route flow (`pickPhotoWithAnnotation({ skipAnnotate })`)
  — works here precisely because this is a screen, not a modal.

## Internal files
- `CertificatesManager.tsx` — list view + view-state + reload.
- `CertEditForm.tsx` — the edit form (chips, number, 16:9 photo, Save).

## Gotchas / non-obvious things
- Attachments are NOT a React Query cache; each result screen loads them
  into local state. Cross-screen refresh is signalled via
  `lib/certDirty.ts` (`markCertsDirty` / `consumeCertsDirty`), consumed
  in a `useFocusEffect` on `InspectionResultView` and `app/inspections/[id].tsx`.
- `inspection_attachments` rows FK to `inspections.id`; photos live in the
  `certificates` storage bucket (distinct from the `certificates` table of
  generated PDFs and from `qualifications`).

## Canonical helpers used
- `lib/services` — `inspectionAttachmentsApi`.
- `hooks/usePhotoPicker`, `lib/imageUrl` (`imageForDisplay`),
  `components/HeaderBackButton`, `lib/theme`, `lib/certDirty`.
