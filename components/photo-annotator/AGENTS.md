# photo-annotator

## What this module does
Full-screen photo annotation canvas. Inspectors draw on photos before
upload — circle defects, arrow to cracks, write measurements. Uses
SVG + `PanResponder` for drawing and `react-native-view-shot` to
flatten the annotated SVG back onto the original photo and emit a
new file URI.

## Public API (from index.ts)
- `default` (`PhotoAnnotator`) — `({ sourceUri, onSave, onCancel })`.
- `PhotoAnnotatorProps` type.

## Internal files
- `PhotoAnnotator.tsx` — the component. Owns the annotations array,
  current-stroke state, tool/color/width toolbar state, the text-tool
  modal, the move-tool drag session (`selectedId` + `dragRef`), and
  the `captureRef` → `onSave` flatten step.
- `schema.ts` — `Tool` union (includes `'move'`), `Point`,
  `Annotation`, `Bounds`, `PhotoAnnotatorProps`; constants `COLORS`,
  `WIDTHS`, `SCREEN`; pure helpers `uid`, `pointsToPathD`,
  `arrowHead`, plus the move-tool geometry helpers `annotationBounds`,
  `hitTestAnnotation`, `translateAnnotation`.
- `styles.ts` — `getstyles(theme)` (full-screen layout) + `getmodalStyles(theme)`
  (text-tool modal card).

## Gotchas / non-obvious things
- The `move` tool (first toolbar button) selects the topmost
  annotation under a tap (bounding-box hit-test, last-drawn wins) and
  drags it; the live drag rewrites that annotation's coordinates via
  `translateAnnotation`. The dashed selection outline is only drawn
  while `tool === 'move'`, and `save()` clears `selectedId` + waits one
  `requestAnimationFrame` before `captureRef` so the outline is never
  baked into the flattened image.
- `SCREEN = Dimensions.get('window')` is captured at *module load*.
  Rotation after load is not re-measured. Acceptable here because the
  annotator is a modal screen that's mounted fresh per launch.
- The flatten step uses `captureRef` on a container `View` that holds
  the original `<Image>` plus the `<Svg>` overlay. Both must be
  measured to the same pixel rect — see `imgW` / `imgH` state +
  `onLoad` in the component.
- `arrowHead(start, end)` returns the polygon points string (not a
  path d), so it's used inside `<Polygon points="...">` not `<Path>`.

## Canonical helpers used (from lib/)
- `lib/theme`, `lib/haptics`, `lib/accessibility`.
- `react-native-view-shot` — `captureRef`.
