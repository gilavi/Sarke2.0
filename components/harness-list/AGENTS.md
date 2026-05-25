# harness-list

## What this module does
Full-screen "kamari" inspection takeover used by the inspection wizard
when a harness `component_grid` question (rows starting with `N1`) is
reached. Step 1 picks how many belts to inspect, step 2 walks one
belt at a time through a chip list (✓ / ✗ per component, with a
description + photos accordion when ✗).

Rendered by `features/inspection-wizard/InspectionWizard.tsx` and
`app/inspections/harness/[id].tsx`.

## Public API (from index.ts)
- `HarnessListFlow` — the full-screen component. **Requires an
  `inspectionId` prop** (keys the session position cache).
- `HarnessListFlowProps` — its props.

`components/HarnessListFlow.tsx` kept as a 1-line barrel so existing
imports `from '../components/HarnessListFlow'` keep resolving.

## Internal files
- `HarnessListFlow.tsx` — the orchestrator. Owns `step ('count' |
  'list')`, `currentRowIdx`, a **local `draft`** of grid values
  (row→col→value, keyed by question id, seeded once from `answers`),
  the tour refs, and the mutation/nav callbacks (`handleSet`,
  `handleComment`, `confirmCurrentRow`, `flush`). A `ChipNavStrip` at
  the top of the list lets the user jump between harnesses;
  "დადასტურება →" still advances linearly.
- `ChipRow.tsx` — single component row: label, ✓ / ✗ chips,
  accordion with description + photo strip when ✗. Its callbacks are
  stable and receive `(item, row)` (`onSet`, `onCommentChange`,
  `onPickPhoto`, `onHelp`); it's `memo`'d with a custom comparator so
  only the touched row re-renders.
- `CellPhotoThumb.tsx` — small 60x60 thumbnail with delete chip; handles
  local URIs vs Supabase-resolved URLs and a refresh-on-error fallback.
- `_shared.ts` — `HarnessItem` type + pure helpers (`buildItems`,
  `rowLabelsFor`, `cellState`, `readComment`, `captionFor`).
- `styles.ts` — `gets(theme)` factory.

## Gotchas / non-obvious things
- **Edits are local until you advance/leave.** ✓/✗ taps and comments
  mutate the in-memory `draft` only — they do NOT call `onPatchAnswer`
  per interaction (doing so re-rendered the parent wizard and reloaded
  the whole screen on every tap). `flush()` persists the whole draft
  to the server in one batch, and is called only on **conclude** (the
  last harness's "დადასტურება →") and on **close**. Advancing between
  harnesses and chip-jumping are purely local. Trade-off: a hard
  app-kill mid-flow (before conclude/close) loses unsaved rows.
- **Position cache.** `step`/`currentRowIdx` are mirrored into a
  module-level `flowPos` Map keyed by `inspectionId`, restored on
  mount — so an unexpected remount restores the user's place (list +
  active harness) instead of bouncing back to the count picker.
- Read state from the draft via `draftStateOf` / `draftCommentOf`, not
  `cellState`/`readComment` (those still exist in `_shared` for other
  callers and read from persisted `answers`).
- `cellState` reads `'bad'`/`'ok'` AND legacy `'დაზიანებულია'`/`'ვარგისია'`
  — older inspections written by the previous wizard wrote the
  Georgian strings. Don't normalize them on read; the PDF/results
  screens still read the original values.
- "Auto-ok" defaults every untouched cell in the current row to ✓ when
  you confirm it (`buildAutoOkSnapshot`), then advances. The snapshot
  is flushed (on the last row) so the persisted record matches the UI.
- Photos are tied to `caption == 'row:N{i}:col:{col}'`. On flush, cells
  ending up ✓ have their photos removed (the problem is gone). Don't
  change the caption shape — KamariFlow / older wizard versions read
  the same format.
- The tour uses `tourId: 'harness_list_v2'`. Bumping it to v3 would
  re-show the tour to every existing user.

## Canonical helpers used (from lib/)
- `lib/theme` — `useTheme`, `Theme` type.
- `lib/haptics`, `lib/imageUrl`, `lib/supabase` — `STORAGE_BUCKETS`.
- `components/inspection-parts/ChipNavStrip` — the harness jump-nav strip.
- `components/TourGuide` — `TourGuide`, `TourStep`.
- `components/ScaffoldHelpSheet` — `HelpIcon`, `useScaffoldHelpSheet`.
- `components/inputs/FloatingLabelInput`.
- `components/primitives/A11yText`.
