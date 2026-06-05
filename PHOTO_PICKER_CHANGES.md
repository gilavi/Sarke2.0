# Photo picker — pinch-zoom + multi-photo (2026-06-04)

Branch: **`app/photo-zoom-multiselect-2026-06-04`** (off latest `main`). Mobile app only —
nothing under `web-app/`, `web/`, or `website/` was touched. Not pushed. Review with
`git diff main...app/photo-zoom-multiselect-2026-06-04`.

## Summary

Two features on the combined camera + library picker (`app/photo-picker.tsx`):

1. **Pinch-to-zoom while capturing** — drives `CameraView`'s `zoom` (0–1) via a
   gesture-handler `Pinch`, with a subtle fading indicator pill (1.0×–5×) and a reset to
   wide after each capture.
2. **Multiple photos at once** — recent-strip multi-select (checkmarks + count + a
   "დასრულება (n)" bar) and system-library multi-select, both skipping annotation and
   added directly. A single live shutter capture still annotates and returns one photo.

The picker bus was unified on arrays, and a new `pickPhotosWithAnnotation` hook method
fans the batch out to the gallery screens. **Single-slot callers were intentionally left
on the existing single-photo `pickPhotoWithAnnotation`** (per the chosen low-risk approach),
so they are completely unchanged.

## Files touched

### Core (the picker + the contract)

- **`lib/photoPickerBus.ts`** — picker callback is now `(uris: string[] | null) => void`
  (a single pick resolves `[uri]`; cancel resolves `null`). Added a `fromCapture`
  side-channel (`set/getLastPhotoFromCapture`) so the hook knows whether a result came
  from a live shutter capture (annotate it) or a strip/library batch (add directly).
  Rewrote the usage comment block (it documented the old single-URI API).
- **`hooks/usePhotoWithLocation.ts`**
  - `pickPhotoWithAnnotation` — **unchanged signature/behavior** (`PhotoWithLocation | null`).
    Internally it now reads the first URI from the array; it only ever opens the picker in
    single mode, so it always sees ≤1.
  - **`pickPhotosWithAnnotation(opts?)` (new)** — opens `/photo-picker?multi=1`. Returns
    `PhotoWithLocation[]` (`[]` if cancelled). A single live capture keeps the annotate step
    (unless `skipAnnotate`) and resolves one photo; a strip/library batch skips annotation
    and resolves all of them sharing one location + timestamp.
  - Updated the hook doc comment.
- **`app/photo-picker.tsx`** — full rewrite of the screen:
  - **Pinch-to-zoom**: `Gesture.Pinch()` over **only** the camera viewfinder (so it can't
    fight the horizontal strip). `onStart` captures the base zoom; `onUpdate` applies the
    scale delta × sensitivity, clamps 0–1, drives `CameraView zoom`, and pulses the
    indicator pill (reanimated `withSequence`/`withDelay`, fades when idle). Zoom resets to
    0 after each capture.
  - **Multi mode** (`?multi=1`): strip thumbnails toggle an ordered selection with a numbered
    checkmark overlay; a "დასრულება (n)" bar commits the batch. System library uses
    `allowsMultipleSelection` + `selectionLimit: 10`.
  - **iCloud/`ph://` handling** extracted into `toLocalUri` / `resolveAssetUri` and applied
    to **every** asset (strip and library), not just the first.
  - Resolves arrays via the bus and sets the `fromCapture` flag. Batch resolves dismiss the
    picker themselves (the annotator's `router.replace` doesn't run for batches).

### Gallery callers migrated to `pickPhotosWithAnnotation` (loop, sequential upload)

- `app/incidents/new.tsx` — adds all picked photos to the incident form.
- `features/inspection-wizard/useWizardState.ts` — answer photos (per-question gallery);
  unique path per photo so a batch can't collide on `Date.now()`.
- `features/project-detail/ProjectDetail.tsx` — project files (passes the whole array to the
  existing `uploadAssets`).
- Equipment item/summary photo handlers in: `app/inspections/{bobcat, excavator,
  cargo-platform, general-equipment, mobile-ladder, lifting-accessories, safety-net,
  forklift}/[id].tsx`, and the harness answer-photo handler in
  `app/inspections/harness/[id].tsx`. Each loops the array and uploads **sequentially**.

### Single-slot callers — intentionally left on `pickPhotoWithAnnotation` (unchanged)

- `features/order-new/NewOrderScreen.tsx` — crane cert photo fields (one each).
- `app/reports/[id]/slide/[slideId].tsx` — one photo per report slide.
- `forklift` + `safety-net` **`handleAddQualDoc`** — a single qualification document
  (`qualDocPath`, not an array). Those two screens now destructure **both** hook methods.

### Docs

- `docs/primitives.md` — added the `pickPhotosWithAnnotation` row + multi-select notes.
- `features/inspection-wizard/AGENTS.md` — points at `pickPhotosWithAnnotation`.

## Zoom behavior

- `CameraView zoom` is 0–1; a pinch adds `(scale − 1) × 0.5` to the base, clamped to 0–1.
- Indicator pill shows `1.0×`–`5×` (`1 + zoom × 4`), fades ~0.9 s after the last change.
- Reset to 0 after each capture so the next shot starts wide.
- Wrapped only the viewfinder; single taps (shutter, close, library, Done) still work
  because Pinch needs two pointers.

## Multi-select behavior

- **Recent strip** (the chosen UX): tap toggles selection (numbered checkmark + dimmed
  ring); "დასრულება (n)" commits. Each selected asset is resolved to a readable local URI
  (`getAssetInfoAsync` + `ph://` → local copy) before returning.
- **System library**: `allowsMultipleSelection` + `selectionLimit: 10`; every asset gets the
  iCloud/`ph://` → local-copy treatment.
- Any strip/library batch (1 or many) **skips annotation**; only a live shutter capture is
  annotated. Cancel / empty selection resolves cleanly with no orphaned callbacks.

## Bus signature change + every caller updated

- `setPhotoPickerCallback` / `resolvePhotoPicker` are now array-based (`string[] | null`).
- The only code that calls `setPhotoPickerCallback` is `hooks/usePhotoWithLocation.ts`
  (both methods updated). The ~16 screens call the hook, not the bus — they were updated as
  listed above (gallery → plural method; single-slot → unchanged single method).
- **`components/CertificatesActionSheet.tsx` is NOT a bus caller** — it uses
  `pickPhotoFromLibrary` (a direct `ImagePicker` path) because it runs inside a Modal where
  `router.push` to the picker doesn't work. It was listed as a caller in the task but does
  not touch the bus; left unchanged (a certificate is a single photo anyway).

## Deferred / notes

- **Tap-to-focus** — deferred (the task marked it optional, "skip if flaky"). `CameraView`'s
  focus behavior in Expo Go on iOS is inconsistent; not shipped to avoid jank.
- **`selectionLimit` = 10** for the system library (the task suggested a "sane cap like 10";
  say the word if you'd prefer unlimited).
- **Picker dismissal (fixed):** when a pick won't be annotated, the annotator's
  `router.replace` never runs, so the picker must dismiss itself. The hook passes `skip=1`
  to the picker for `skipAnnotate` callers, and the picker dismisses after any resolve that
  isn't annotated — a capture/strip/library pick when `skipAnnotate`, or any multi-mode
  batch. (Annotated single-mode picks are still replaced by the annotator as before.) This
  fixes the incidents case where a shutter capture attached the photo but left the picker
  open until manually closed.
- **Tooling finding (not fixed):** `scripts/check-primitives.mjs` uses
  `new URL('..').pathname`, which yields a `C:\C:\…` path on Windows; `readdirSync` then
  throws, the walker swallows it, and the check scans **zero files** and prints
  "check-primitives: ok" — i.e. it is a silent no-op on Windows (same bug class fixed in
  `web-app/scripts/check-no-shadows.mjs`). Out of scope for this task; flagged for a future
  tooling pass. My changes keep all direct `ImagePicker` calls inside the two allow-listed
  files (`app/photo-picker.tsx`, `hooks/usePhotoWithLocation.ts`), so the rule passes
  regardless.

## Verification (run from repo root)

| Check | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | ✅ clean |
| `npm run lint` (`tsc` + `check-primitives`) | ✅ clean |
| `npm run test:unit` | ✅ 781 vitest + 61 node:test pass |
| `npm run test:integration` | ✅ 30 pass (4 files) |
| `npm run test:e2e` (Playwright) | ✅ 12 pass (web-export auth/nav smoke — unrelated to camera, but green) |

> Expo version-mismatch warnings during the e2e web server (`expo@54.0.34` vs `~54.0.35`,
> etc.) are **pre-existing** — no dependencies were changed in this task.

### Manual Expo Go (iOS) — still to do (camera can't be unit-tested)

- [ ] Pinch-zoom smooth; indicator reflects it; captured photo respects the zoom; zoom resets after capture.
- [ ] System-library multi-select adds **all** chosen photos.
- [ ] Strip multi-select + "დასრულება (n)" adds all selected; checkmarks/count behave.
- [ ] Single shutter still annotates and adds exactly one (e.g. a report slide).
- [ ] iCloud-backed (`ph://`) photos upload correctly in batches.
- [ ] Denied permissions still degrade gracefully (camera-denied → library-only; library-denied → settings prompt).
