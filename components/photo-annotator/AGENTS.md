# photo-annotator

## What this module does
Full-screen photo **edit** canvas: crop + annotate. Inspectors frame a
photo (pinch-to-zoom + drag crop) then draw on it before upload —
circle defects, arrow to cracks, write measurements. Crop goes through
`expo-image-manipulator` (via `lib/imageEditing.ts`); drawing uses SVG +
`PanResponder` and `react-native-view-shot` to flatten the annotated SVG
back onto the (possibly cropped) photo and emit a new file URI.

The editor is **always dark** (a fixed local palette, not the app
theme) — the image is the hero and pops against dark chrome, the
standard for photo editors.

## Public API (from index.ts)
- `default` (`PhotoAnnotator`) — `({ sourceUri, onSave, onCancel })`.
- `PhotoAnnotatorProps` type.

## Internal files
- `PhotoAnnotator.tsx` — the component. Owns the `mode` (`'crop' |
  'markup'`), the annotations array, current-stroke state,
  tool/color/width state, the text-tool modal, the move-tool drag
  session (`selectedId` + `dragRef`), the crop commit, and the
  `captureRef` → `onSave` flatten step.
- `useImageEditSession.ts` — hook owning the **working image**:
  `workingUri` (normalized once on mount), `imgW`/`imgH`, the
  `photoLayout` contain-fit box, and the async `applyCrop`/`applyRotate`
  transforms (no prompts). `applyCrop` returns the new `EditedImage` so
  the caller can finalize the cropped image without awaiting state.
- `PinchZoomCrop.tsx` — the cropper: a fixed window (== photo box) with
  the image transformed by a pinch (`Gesture.Pinch`) + pan
  (`Gesture.Pan`) via `react-native-gesture-handler` + `reanimated`
  shared values, plus a thirds grid + corner brackets overlay. Exposes
  `getTransform()` / `reset()` through a `forwardRef` imperative handle.
  Owns **no** crop math — the transform is mapped to pixels by
  `cropGeometry`.
- `cropGeometry.ts` — **pure** (no RN imports) crop math. The live path:
  `zoomPanToPixels` (transform → source-pixel rect, round-then-clamp),
  `panClamp` (cover bounds per zoom), `isIdentityZoomPan`. The legacy
  rect helpers (`clampRectToBounds`, `centeredAspectRect`,
  `enforceAspect`, `moveRect`, `resizeRect`, `displayRectToPixels`,
  `ASPECT_PRESETS`, `swapDimsForRotate`) are kept (still unit-tested) for
  a future rect/rotate UI but are not wired today. All unit-tested in
  `tests/unit/cropGeometry.test.ts`.
- `AnnotatorToolbar.tsx` — the bottom **sheet**. A segmented Crop /
  Markup control at the top, then mode-specific controls: crop = an
  interaction hint + Reset; markup = the draw-tools row + a color-swatch
  + brush-size options row. The color/size controls live **here** now
  (they used to float over the canvas).
- `schema.ts` — `Tool` union (includes `'move'`), `STROKE_TOOLS` /
  `COLOR_TOOLS` groups, `Point`, `Annotation`, `Bounds`,
  `PhotoAnnotatorProps`; constants `COLORS`, `SIZE_PRESETS`, `SCREEN`;
  pure helpers `uid`, `pointsToPathD`, `arrowHead`, plus the move-tool
  geometry helpers `annotationBounds`, `hitTestAnnotation`,
  `translateAnnotation`.
- `styles.ts` — the fixed dark `EDITOR` palette + `getstyles()` (chrome
  + sheet, theme-independent) + `getmodalStyles(theme)` (the text-tool
  modal card, which stays app-themed).

## Gotchas / non-obvious things
- **`photoBox` is sized to `photoLayout` + image is `contain`.**
  `photoBox` (sized inline to `photoLayout.{w,h}`, centered by
  `canvasWrap`) is the markup capture target AND the crop window. Its
  aspect equals the image aspect, so display→source-pixel is one uniform
  scale, `captureRef` preserves the true aspect, and the pinch crop maps
  back to pixels exactly. `photoLayout` depends only on the image dims +
  insets (NOT `mode`), so the box stays constant across a Crop↔Markup
  switch — load-bearing: the crop math reuses the very box the user
  framed in.
- **The cropper is pinch-zoom only — no rect, no aspect presets.** At
  scale 1 the image fills the window (no crop); zooming in shrinks the
  visible source region and the output keeps the source aspect. Pan is
  clamped to the cover bounds (`panClamp`) so no empty gap enters the
  frame. `PinchZoomCrop` reports the transform; `zoomPanToPixels` turns
  it into the crop rect (round THEN clamp — a 1px overshoot makes the
  native crop throw).
- **Crop commits on leaving crop mode (and on Done).** There is no
  explicit Apply button: switching the segment Crop→Markup, or pressing
  the header ✓ while in crop, calls `commitCrop` — if the transform is
  non-identity it runs `applyCrop` (a real `expo-image-manipulator`
  crop) and replaces `workingUri`. Reset returns the transform to fit
  (no crop on leave).
- **Entering crop resets annotations** (not leaving). Cropping changes
  the coordinate space, so `runWithAnnotationReset` confirms (Alert)
  when switching INTO crop with annotations present, then clears them.
  Crop mode therefore always has zero annotations, so the later commit
  needs no further prompt. Crop-then-draw is the intended order.
- **Done (✓) is the single commit.** In crop mode it commits the crop
  then finalizes; in markup it finalizes directly. `finalize` returns
  `workingUri` at full resolution when there are **no** annotations
  (skipping the `captureRef` downscale) and only flattens via
  `captureRef` when annotations exist.
- **Floating undo/clear must stay outside `photoContainerRef`.** The
  markup undo + clear pill is a *sibling* of the captured photo View
  inside `photoBox`, so it never bakes into the saved JPG. Likewise the
  color/size row lives in the sheet (structurally outside the capture).
- `useImageEditSession` runs `normalizeImage` (a no-op manipulate) once
  on mount to bake EXIF orientation and materialize a remote URI (the
  signed Supabase URL from `reAnnotatePhoto`) to a local file — without
  it, a crop computed against `Image.getSize` display dims can come out
  rotated/flipped. (Manual rotate was dropped from the UI; EXIF is still
  normalized, so photos load upright.)
- The `move` tool selects the topmost annotation under a tap
  (bounding-box hit-test, last-drawn wins) and drags it; the dashed
  selection outline is only drawn while `tool === 'move'`, and `finalize`
  clears `selectedId` + waits one `requestAnimationFrame` before
  `captureRef` so the outline is never baked in.
- The crop GestureDetector requires a `GestureHandlerRootView` ancestor
  — provided at the app root (`app/_layout.tsx`); the annotate screen is
  a `fullScreenModal` under it.
- `SCREEN = Dimensions.get('window')` is captured at *module load*.
  Rotation after load is not re-measured — acceptable for a modal screen.
- `arrowHead(start, end)` returns the polygon points string (not a
  path d), so it's used inside `<Polygon points="...">` not `<Path>`.

## Canonical helpers used (from lib/)
- `lib/imageEditing` — `cropImage` / `rotateImage` / `normalizeImage`
  (the canonical owner for in-app geometric edits).
- `lib/design-tokens` — `primary` (brand orange, for the editor accent).
- `lib/theme` (text modal only), `lib/haptics`, `lib/accessibility`.
- `react-native-gesture-handler` + `react-native-reanimated` — pinch/pan.
- `react-native-view-shot` — `captureRef`.
