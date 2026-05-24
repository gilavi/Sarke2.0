# wizard/kamari

## What this module does
Three-view harness ("ქამარი") inspection flow:

1. `KamariCount` — pick how many belts to inspect.
2. `KamariOverview` — grid of belt cards (green/amber/red), tap to drill in.
3. `KamariDetailModal` — per-belt component checklist with accordions
   for description + photos.

Maps onto the existing harness `component_grid` `Answer.grid_values`
shape so the results screen and PDF generation keep working unchanged
(see `_shared.ts` for the schema).

## Public API (from index.ts and KamariFlow.tsx)
- `KamariCount`
- `KamariOverview`
- `KamariDetailModal`
- `KamariPhotoThumb` (also re-exported for callers needing the
  individual thumbnail control)

## Internal files
- `KamariCount.tsx` — the count picker (Step 1).
- `KamariOverview.tsx` — the belt-grid + `KamariCard` (Step 2).
- `KamariDetailModal.tsx` — the per-belt accordion modal (Step 3).
- `KamariPhotoThumb.tsx` — small thumbnail with delete control.
- `_shared.ts` — types/helpers: `rowKey`, `captionFor`,
  `componentColsFor`, `maxRowsFor`, `badCountFor`, `BRAND_GREEN`,
  `COMMENT_PREFIX`.
- `styles.ts` — `getstyles(theme)` factory.
- `KamariFlow.tsx` — backwards-compat barrel that re-exports all
  four named components, in case any tests/web pages still import
  the file path verbatim.

## Gotchas / non-obvious things
- The Kamari data model lives on the SAME `Answer.grid_values` rows
  as the older HarnessListFlow (rows `N1..N15`, columns =
  `question.grid_cols` minus `კომენტარი`, plus
  `კომენტარი_<col>` companion keys). Don't introduce a new schema —
  legacy completed inspections still need to render.
- Photo captions follow `row:N{i}:col:{col}` — must match the format
  HarnessListFlow uploads with, otherwise photos won't appear in the
  belt's detail modal.
- Originally exported from a single 713-line file; no current mobile
  caller imports these components, but the named exports are retained
  in case the web-app re-wires through this path.

## Canonical helpers used (from lib/)
- `lib/theme` — `useTheme`, `Theme` type.
- `lib/haptics`, `lib/accessibility`.
- `lib/imageUrl` — `imageForDisplay`.
- `lib/supabase` — `STORAGE_BUCKETS`.
- `components/ui` — `Button`; `components/primitives/A11yText`;
  `components/inputs/FloatingLabelInput`.
