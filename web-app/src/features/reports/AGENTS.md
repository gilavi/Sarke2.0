# features/reports

## What this module does

The photo-report (რეპორტი) flow: slide-based reports where each slide is a
description + 1–2 photos + a render layout. Draft reports edit inside the
canonical SplitWizard with a live presentation preview; completed reports get
a read-only view. Routes: `/reports/new` (`pages/NewReportPage.tsx`) and
`/reports/:id` (`pages/ReportPage.tsx`, status-branches draft→editor,
completed→view — same pattern as StructuredActPage).

## Public API

- **`ReportEditor`** — the draft flow (SplitWizard chrome; autosave per change).
- **`ReportView`** — read-only completed report (header + slide sheets + delete).
- **`ReportPreview`** — the presentation rendering (A4-landscape sheet per slide);
  shared by the editor's live preview and ReportView.
- **`ReportCoverThumb`** — cover-photo thumbnail (first photo of first slide,
  signed URL) for list rows; falls back to a FileText IconChip (danger tone).
- **`useSlideSignedUrls`** — path→signed-URL map for all slide display photos.

## Internal files

- `SlideEditorCard.tsx` — one editable slide: title/description are CONTROLLED
  inputs with commit-on-blur + revert-on-rejected-save (the old SlideCard
  pattern); photos via PhotoUploadWidget wired to the `report-photos` bucket;
  layout chips appear once photos exist (1 photo: text-photo/photo-full;
  2 photos: two-side/two-stacked).

## Gotchas

- `onSave` passed to SlideEditorCard **must reject on failure** (pass
  `mutateAsync`) — the text-field revert depends on the rejection.
- Slide layout keys mirror the mobile `ReportSlideLayout` exactly
  (`text-photo` / `photo-full` / `two-side` / `two-stacked`); don't invent new
  keys — mobile renders the same JSON.
- `deleteReport` takes the whole `Report` object (it removes the slides'
  storage blobs first) — keep the row object around in list surfaces.
- PDF generation is not wired on web yet (mobile-only); `pdf_url` is read-only.

## Canonical helpers it consumes

- `@/lib/data/reports` — CRUD + `slideImages`/`slideDisplayPaths`/`slideLayout`
  + the report-photos upload/signed-URL/delete trio for PhotoUploadWidget.
- `@/components/ui/split-wizard`, `@/components/DeleteButton`,
  `@/components/StatusBadge`, `@/components/PhotoUploadWidget`.
- `@/features/inspections/structured/WizardCloseDialog` — the close confirm.
