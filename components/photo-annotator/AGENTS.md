# photo-annotator

## What this module does
Full-screen photo **edit** canvas: crop, 90° rotate, and annotate.
Inspectors frame a photo (crop / rotate) then draw on it before upload
— circle defects, arrow to cracks, write measurements. Crop/rotate go
through `expo-image-manipulator` (via `lib/imageEditing.ts`); drawing
uses SVG + `PanResponder` and `react-native-view-shot` to flatten the
annotated SVG back onto the (possibly cropped/rotated) photo and emit a
new file URI.

## Public API (from index.ts)
- `default` (`PhotoAnnotator`) — `({ sourceUri, onSave, onCancel })`.
- `PhotoAnnotatorProps` type.

## Internal files
- `PhotoAnnotator.tsx` — the component. Owns the annotations array,
  current-stroke state, tool/color/width state, the text-tool modal,
  the move-tool drag session (`selectedId` + `dragRef`), the crop-mode
  state (`cropMode` + `aspect` + `cropRectRef`), and the
  `captureRef` → `onSave` flatten step.
- `useImageEditSession.ts` — hook owning the **working image**:
  `workingUri` (normalized once on mount), `imgW`/`imgH`, the
  `photoLayout` contain-fit box, and the async `applyCrop`/`applyRotate`
  transforms (no prompts). Lifted out so the component stays near its
  size target and crop math has one source of dims.
- `CropOverlay.tsx` — the crop UI: a four-View dim mask + a
  draggable/resizable crop rect (its own `PanResponder`, corner-resize
  vs body-drag) + thirds grid. Reports the live rect up via
  `onRectChange`.
- `cropGeometry.ts` — **pure** (no RN imports) crop math:
  `clampRectToBounds`, `centeredAspectRect`, `enforceAspect`,
  `moveRect`, `resizeRect`, `displayRectToPixels` (round-then-clamp),
  `swapDimsForRotate`, plus `ASPECT_PRESETS` (Free / 1:1 / 4:3 / 16:9).
  Unit-tested in `tests/unit/cropGeometry.test.ts`.
- `AnnotatorToolbar.tsx` — the bottom toolbar, extracted. Draw mode is
  now a **single row** (distinct Crop chip + horizontally-scrollable
  draw tools) then the primary Save pill (orange, black text). The
  color + size controls are **not** here — they float over the canvas
  (see below), so the footer never grows to two rows. Crop mode: just
  Cancel / Apply — aspect presets were removed and Rotate moved to the
  header.
- `AnnotatorColorBar.tsx` — floating color palette: a rounded pill that
  fades in over the **bottom-center** of the canvas while a stroke tool
  is active. Rendered in the canvas overlay layer (a sibling of the
  captured photo View), so it never bakes into the saved image.
- `AnnotatorSizeBar.tsx` — floating brush-size picker: a vertical pill
  on the **right** edge of the canvas, three discrete `SIZE_PRESETS`
  (thin/medium/thick) instead of a drag slider (the old slider
  re-measured its track and the thumb jumped). Also a canvas-overlay
  sibling, outside the captureRef target. The active dot previews the
  current draw color.
- `schema.ts` — `Tool` union (includes `'move'`), `Point`,
  `Annotation`, `Bounds`, `PhotoAnnotatorProps`; constants `COLORS`,
  `SIZE_PRESETS`, `SCREEN`; pure helpers `uid`, `pointsToPathD`,
  `arrowHead`, plus the move-tool geometry helpers `annotationBounds`,
  `hitTestAnnotation`, `translateAnnotation`.
- `styles.ts` — `getstyles(theme)` (full-screen layout) + `getmodalStyles(theme)`
  (text-tool modal card).

## Gotchas / non-obvious things
- **`photoBox` is sized to `photoLayout` + image is `contain`** (not the
  old `flex:1` + `cover`). `photoBox` (sized inline to `photoLayout.{w,h}`,
  centered by `canvasWrap`) holds two absolute-fill children: `photoFill`
  (the `captureRef` target — image + annotation `Svg` + crop overlay) and
  the floating-controls overlay. This is load-bearing: the box aspect
  equals the image aspect, so display→source-pixel is one uniform
  scale (`imgW / photoLayout.w`) for crop, AND `captureRef` preserves
  the true photo aspect instead of silently cover-cropping to the
  phone's canvas (the old behavior — a latent bug that fed weird
  aspect ratios into report PDFs). The floating pills sharing `photoBox`
  means they hug the **image** edges, not the letterbox margins.
- **Crop/rotate reset annotations.** They change the coordinate space,
  so existing annotations no longer map. `runWithAnnotationReset`
  confirms (Alert) before discarding them, then runs the transform.
  Crop-then-draw is the intended order.
- **Crop mode disables the drawing PanResponder** (panHandlers aren't
  spread) — otherwise `captureRef` would bake the crop mask + frame into
  the image. Apply/Cancel live in the toolbar; the header ✕ cancels crop
  mode and the header right-action becomes **Rotate** (rotate is only
  reachable inside crop/adjust mode). In draw mode the header right holds
  **Undo + Clear**; Save is the orange pill at the bottom of the toolbar
  (not a header button).
- **Floating brush controls must stay outside `photoContainerRef`.** The
  color + size pills are rendered in a `pointerEvents="box-none"` overlay
  layer (`floatingLayer`) that is a *sibling* of the captured photo View
  (`photoFill`/`photoContainerRef`) inside `photoBox`. If they were
  children of `photoFill` they'd flatten into the saved JPG. `box-none` is
  load-bearing: it lets draw touches fall through to the canvas everywhere
  except on the pills themselves. The color bar shows for `COLOR_TOOLS`
  (stroke tools **+ text** — text uses color too), the size bar only for
  `STROKE_TOOLS` (text width is fixed); both hide in crop mode.
- **Progressive disclosure.** The floating color/size pills fade/slide in
  (their own native-driven `Animated`) when a stroke tool becomes active;
  the toolbar swap between draw/crop still uses `animateLayout()` (an
  `easeInEaseOut` `LayoutAnimation`, Android opt-in via
  `setLayoutAnimationEnabledExperimental`) so the footer height eases.
- `useImageEditSession` runs `normalizeImage` (a no-op manipulate) once
  on mount to bake EXIF orientation and materialize a remote URI (the
  signed Supabase URL from `reAnnotatePhoto`) to a local file — without
  it, a crop rect computed against `Image.getSize` display dims can
  come out rotated/flipped.
- The `move` tool selects the topmost annotation under a tap
  (bounding-box hit-test, last-drawn wins) and drags it; the dashed
  selection outline is only drawn while `tool === 'move'`, and `save()`
  clears `selectedId` + waits one `requestAnimationFrame` before
  `captureRef` so the outline is never baked in.
- `SCREEN = Dimensions.get('window')` is captured at *module load*.
  Rotation after load is not re-measured. Acceptable — the annotator is
  a modal screen mounted fresh per launch.
- `arrowHead(start, end)` returns the polygon points string (not a
  path d), so it's used inside `<Polygon points="...">` not `<Path>`.

## Canonical helpers used (from lib/)
- `lib/imageEditing` — `cropImage` / `rotateImage` / `normalizeImage`
  (the canonical owner for in-app geometric edits).
- `lib/theme`, `lib/haptics`, `lib/accessibility`.
- `components/ui/FilterChipRow` — aspect-ratio chips.
- `react-native-view-shot` — `captureRef`.
