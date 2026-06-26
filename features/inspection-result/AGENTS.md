# inspection-result

## What this module does
Shared data + actions for the **inspection-act result screens**, so the act
SUCCESS screen and the act DETAILS screen stay thin and never drift:

- `/inspections/[id]/done` → `FlowSuccessScreen` (post-save, celebratory).
- `/inspections/[id]` → `DocumentDetails` (reached by tapping a saved act).

Both load the same data (inspection + template + project + questions + answers +
attachments), hold the same editable-but-never-persisted signature state, build +
share the same act PDF, and open the same certificate sub-screen.

It also owns `EquipmentResultDetails` — the shared DETAIL page for the typed
equipment inspections (bobcat, excavator, forklift, cargo-platform,
fall-protection, general-equipment, lifting-accessories, mobile-ladder,
safety-net). Those screens are monoliths (wizard + completed view in one file);
when `status === 'completed'` they now render `EquipmentResultDetails` instead of
the old full-screen WebView PDF (`components/InspectionResultView`, now orphaned).
Each screen maps its own typed data into normalized props (the type-specific
knowledge stays in the type-specific screen). Harness is a template-based generic
act, so a completed harness redirects to `/inspections/[id]` (this module's act
detail) — it is NOT an `EquipmentResultDetails` consumer.

## Public API (from index.ts)
- `useActResult(id)` — returns the loaded data (`inspection`, `template`,
  `project`, `questions`, `answers`, `attachments`, `certItems`), the
  `signatures` state + `creatorName`, load flags (`loading`, `notFound`,
  `loadError`, `reload`), `downloadPdf` + `downloading` + `pdfLocked` +
  `limitNoticeVisible`/`setLimitNoticeVisible`, `onEdit` + `reopening`, and
  `openCertificatesSheet`. A draft opened here is redirected into the wizard.
- `shareActPdf(args)` — pure-ish "Share PDF" orchestration (re-embed photos +
  cert images, build act HTML, share via expo-print, 30s timeout). Throws on
  failure (incl. `PdfLimitReachedError`).
- `EquipmentResultDetails` — the equipment DETAIL page. Props: `title`,
  `tileIcon?`, `status` (verdict → `{tone,label}` pill, or null), `info[]`,
  `sections` (`ChecklistSection[]` from `lib/inspection/schema`), `resultOptions`
  (`ResultOption[]`, resolves each item's `result` → badge label+tone), `notes?`,
  `summaryPhotos?`, `creatorName`, `onEdit` (reopen), `onShare(snapshot)`
  (→ `handlePdf`), `onBack`, `sharing?`, `pdfLocked?`. Owns `useSignaturesState`
  (never persisted) and renders `DocumentDetails type="act"` with
  `EquipmentChecklistContent` as the body (no Duplicate/Delete chips, no
  certificates — equipment has neither). The `SubscriptionNotice` is rendered by
  each screen alongside it.

## Gotchas / non-obvious things
- **Regulatory:** captured act signatures live only in the hook's
  `useSignaturesState` and are never persisted — `shareActPdf` only rasterizes
  the in-memory snapshot into the PDF. See `features/signatures/AGENTS.md`.
- The hook owns the draft→wizard redirect (via `routeForInspection` +
  `navigationGuard`), so a draft tapped at `/inspections/[id]` lands in the
  wizard, not the details screen.
- Certificates is a pushed screen (`/inspections/[id]/certificates`); the hook
  refetches attachments on focus when `consumeCertsDirty` reports a change.

## Canonical helpers used
- `lib/services` (`inspectionsApi`, `answersApi`, `inspectionAttachmentsApi`,
  `templatesApi`, `projectsApi`), `lib/apiHooks`, `lib/pdf` (+`lib/pdf/inspection`),
  `lib/pdfOpen`, `lib/pdfName`, `lib/imageUrl`, `features/signatures`,
  `lib/documents/reopen`, `lib/inspectionRouting`.
