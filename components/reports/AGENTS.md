# reports

## What this module does
Presentational pieces for the **reports** UI. The slide *editor*
(`app/reports/[id]/slide/[slideId].tsx`) owns the photo strip and
layout chooser; the report *detail* screen (`app/reports/[id].tsx`)
owns the read-only slide card. A slide can carry 1–2 photos and a
chosen render layout. All three components are dumb/presentational —
all picking, uploading, and persistence stay in the route files.

## Public API
- `SlidePhotoRow` — the 0–2 photo strip. Renders one full-width
  dashed "add" box when empty, otherwise a row of square photo tiles
  plus a compact "+ მეორე ფოტო" dashed tile while under the cap.
  Props: `images` (from `slideImages()`), `uploadingIndex`,
  `addingPhoto`, `onTapPhoto(index)`, `onAddPhoto()`. Tapping a photo
  is expected to open the change/annotate/delete sheet in the parent.
- `SlideLayoutPicker` — chips for the layouts valid at the current
  photo count, each a small glyph mirroring the PDF layout. Props:
  `layouts` (from `layoutsForCount()`), `value`, `onChange`. The
  parent should hide it entirely when there's ≤1 valid layout.
- `ReportSlidePreview` — read-only slide card for the report detail
  screen: 1–2 photo thumbs in a row + title + description. Reads
  photos via `slideImagePaths()`. Props: `{ slide, index }`.

## Internal files
- `SlidePhotoRow.tsx` — `PhotoTile` (resolves its own display URI via
  `imageForDisplay`) + `AddTile`.
- `SlideLayoutPicker.tsx` — `LayoutGlyph` draws each schematic.
- `ReportSlidePreview.tsx` — `SlideThumb` resolves each photo's URI.

## Gotchas / non-obvious things
- The 2-photo cap is enforced by **absence**: when `images.length`
  reaches `MAX_SLIDE_PHOTOS` the add tile isn't rendered — no disabled
  button, no error toast.
- Never read `slide.image_path` / `slide.annotated_image_path`
  directly. Photos go through `lib/reportSlides.ts` (`slideImages`,
  `slideImagePath`, `slideLayout`, `withSlideImages`) — the one place
  that knows the legacy single-photo shape.
- Photo display uses `imageForDisplay`; the PDF uses `pdfPhotoEmbed`
  (in the route/PDF builder, not here).

## Canonical helpers used
- `lib/reportSlides.ts` — `slideImagePath`, `slideImagePaths`,
  `MAX_SLIDE_PHOTOS`.
- `lib/imageUrl.ts` — `imageForDisplay`.
- `lib/supabase` — `STORAGE_BUCKETS.reportPhotos`.
- `components/animations/PressBounce`, `lib/theme`,
  `lib/accessibility`, `components/primitives/A11yText`.
