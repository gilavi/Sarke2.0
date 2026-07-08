# photo-picker

## What this module does
The internal building blocks of the `/photo-picker` route
(`app/photo-picker.tsx`) — the combined live-camera + recent-library picker
that all mobile photo-upload flows open (via `hooks/usePhotoPicker.ts`). The
route was split into this slice to keep it under the 300-line route target; the
route stays a thin orchestrator that owns the shared state (library
assets/selection + the `photoPickerBus` handoff) and the `ImagePicker`
system-library escape hatch, and delegates rendering to the two panes here.

## Public API (from index.ts)
- `CameraPane` — the live `CameraView` viewfinder pane. Owns camera permission,
  pinch-to-zoom, and shutter capture internally; emits the captured URI via
  `onCaptured`. Also renders the top bar (cancel + system-library shortcut), the
  shutter, the multi-select "დასრულება (n)" commit bar, and the
  camera-permission placeholder. Props: `onCancel`, `onOpenLibrary`,
  `onCaptured(uri)`, `multiMode`, `selectedCount`, `selecting`, `onCommit`.
- `LibraryStrip` — the bottom horizontal strip of the ~50 most recent library
  photos + the library-permission empty states. Purely presentational;
  selection state lives in the route and is passed down. Props: `libPerm`,
  `assets`, `multiMode`, `selecting`, `selectedIds`, `onPickAsset`,
  `onToggleSelect`, `onRequestLibPerm`.
- `toLocalUri(uri, id)` / `resolveAssetUri(asset)` — resolve `ph://`/iCloud URIs
  to a readable local `file://` copy. `SELECTION_LIMIT` — cap on a single
  system-library multi-pick.

## Internal files
- `pickerHelpers.ts` — constants (`ZOOM_SENSITIVITY`, `SELECTION_LIMIT`),
  `zoomLabel`, and the `toLocalUri`/`resolveAssetUri` URI helpers.
- `pickerStyles.ts` — the shared dark-on-black StyleSheet for both panes.
- `CameraPane.tsx`, `LibraryStrip.tsx` — the two panes above.

## Gotchas / non-obvious things
- **Do not call `ImagePicker` here.** The `direct-image-picker`
  check-primitives rule only whitelists `app/photo-picker.tsx` and
  `hooks/usePhotoPicker.ts` — the system-library call must stay in the route,
  not move into a pane.
- Accessibility labels on the camera controls (close / library / capture /
  done) and on each recent-photo thumbnail are load-bearing (a11y batch) —
  preserve them when editing the panes.
- Behavior parity with the pre-split single-file route is required: single vs
  multi mode, `skip=1` self-dismiss after a non-annotated pick, and the
  `router.dismiss()`-first `close()` are all orchestrated by the route; the
  panes only surface events upward.

## Canonical helpers used
- `lib/photoPickerBus` (resolve/cancel handoff), `hooks/usePhotoPicker.ts`
  (the public entry point that opens this route), `lib/accessibility` (`a11y`),
  `lib/theme`, `components/primitives/A11yText`.
