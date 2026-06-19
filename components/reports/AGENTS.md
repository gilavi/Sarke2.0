# reports

## What this module does
Presentational pieces for the **reports** UI, across three screens:
- **slide list** (`app/reports/[id]/edit.tsx`) — reorderable list of
  slide cards.
- **slide editor** (`app/reports/[id]/slide/[slideId].tsx`) — live
  preview + photo controls + layout chooser + title/description.
- **report detail** (`app/reports/[id].tsx`) — read-only slide cards.

A slide can carry 1–2 photos and a chosen render layout. All
components are dumb/presentational — picking, uploading, URI
resolution, and persistence stay in the route files.

## Public API
- `SlideCanvas` — live, read-only **preview** of a slide: a WYSIWYG
  mirror of the PDF (`lib/reportPdf.ts`) across all four layouts.
  Props: `{ num, title, description, layout, uris }` where `uris` are
  resolved display URIs aligned with the slide's photos (`null` while
  loading). Pure render; updates as the editor state changes.
- `SlideLayoutField` — layout chooser built on the canonical
  `components/ui/Selector` (monochrome rows + check indicator), each
  row a small glyph + label + one-line hint. Props: `layouts` (from
  `layoutsForCount()`), `value`, `onChange`. Parent hides it when
  there's ≤1 valid layout.
- `SlidePhotoRow` — photo controls. Empty slide → one full-width
  dashed "add photo" box. With a photo → a thumbnail strip plus a slim,
  clearly **optional** "მეორე ფოტო (არასავალდებულო)" button (NOT a
  second equal-sized empty box). Takes pre-resolved `uris` aligned with
  `images`; does not fetch. Props: `images`, `uris`, `uploadingIndex`,
  `addingPhoto`, `onTapPhoto(index)`, `onAddPhoto()`.
- `ReportSlideCard` — one row in the slide list, rendered as a fixed-height
  **slide thumbnail** that mirrors the slide's real layout (text+photo /
  big photo / side-by-side / stacked) so the list reads as a deck of slides,
  not a list. Resolves its own photos via `useResolvedImageUris`;
  swipe-to-delete. Props: `{ slide, index, dragging?, onPress, onDelete }`.
  Exports `SLIDE_CARD_HEIGHT` (the reorder list's row-height constant).
- `SlideReorderList` — long-press **drag-to-reorder** wrapper around
  `ReportSlideCard` (custom reanimated v4 + gesture-handler, no drag
  dependency). Props: `{ slides, onPress, onDelete, onReorder(ids) }`.
- `ReportSlidePreview` — read-only slide card for the report detail
  screen: 1–2 photo thumbs + title + description. Reads via
  `slideImagePaths()`. Props: `{ slide, index }`.

## Internal files
- `SlideCanvas.tsx` — per-layout render branches.
- `SlideLayoutField.tsx` — `LayoutGlyph` draws each schematic.
- `SlidePhotoRow.tsx` — `PhotoTile` (takes a resolved `uri`).
- `ReportSlideCard.tsx` — fixed-height card, `SLIDE_CARD_HEIGHT`.
- `SlideReorderList.tsx` — `DraggableRow` + `moveSlot` reinsertion.
- `ReportSlidePreview.tsx` — `SlideThumb` resolves each photo's URI.

## Gotchas / non-obvious things
- The 2-photo cap is enforced by **absence**: at `MAX_SLIDE_PHOTOS`
  the add affordance isn't rendered — no disabled button, no toast.
- The slide editor resolves photo paths → display URIs **once**
  (cached by path) and passes `uris` down to both `SlideCanvas` and
  `SlidePhotoRow`, so the preview and the tiles never double-fetch.
- `SlideReorderList` relies on the fixed `SLIDE_CARD_HEIGHT` for its
  position math; the drag settle lives in `onFinalize` (not `onEnd`)
  so a cancelled drag never strands a card.
- Never read `slide.image_path` / `slide.annotated_image_path`
  directly. Photos go through `lib/reportSlides.ts` (`slideImages`,
  `slideImagePath`, `slideLayout`, `withSlideImages`) — the one place
  that knows the legacy single-photo shape.
- Photo display uses `imageForDisplay`; the PDF uses `pdfPhotoEmbed`
  (in the route/PDF builder, not here).

## Canonical helpers used
- `lib/reportSlides.ts` — `slideImages`, `slideImagePath`,
  `slideImagePaths`, `slideLayout`, `withSlideImages`,
  `layoutsForCount`, `MAX_SLIDE_PHOTOS`.
- `lib/imageUrl.ts` — `imageForDisplay`.
- `lib/supabase` — `STORAGE_BUCKETS.reportPhotos`.
- `components/ui/Selector`, `components/animations/PressBounce`,
  `lib/theme`, `lib/accessibility`, `components/primitives/A11yText`.
