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
- `HarnessListFlow` — the full-screen component.
- `HarnessListFlowProps` — its props.

`components/HarnessListFlow.tsx` kept as a 1-line barrel so existing
imports `from '../components/HarnessListFlow'` keep resolving.

## Internal files
- `HarnessListFlow.tsx` — the orchestrator. Owns `step ('count' |
  'list')`, `currentRowIdx`, the tour refs, and the cell-mutation
  callbacks (`setCell`, `onCommentChange`, `applyAutoOkForCurrentRow`,
  `confirmCurrentRow`).
- `ChipRow.tsx` — single component row: label, ✓ / ✗ chips,
  accordion with description + photo strip when ✗.
- `CellPhotoThumb.tsx` — small 60x60 thumbnail with delete chip; handles
  local URIs vs Supabase-resolved URLs and a refresh-on-error fallback.
- `_shared.ts` — `HarnessItem` type + pure helpers (`buildItems`,
  `rowLabelsFor`, `cellState`, `readComment`, `captionFor`).
- `styles.ts` — `gets(theme)` factory.

## Gotchas / non-obvious things
- `cellState` reads `'bad'`/`'ok'` AND legacy `'დაზიანებულია'`/`'ვარგისია'`
  — older inspections written by the previous wizard wrote the
  Georgian strings. Don't normalize them on read; the PDF/results
  screens still read the original values.
- "Auto-ok" fires *after* `advance()`, so users don't see chips flash
  to ✓ before the step changes. Captured `row`/`answers` snapshot from
  the render makes that ordering safe.
- Photos are tied to `caption == 'row:N{i}:col:{col}'`. Marking a cell
  ✓ removes any photos with that caption (since the problem is
  gone). Don't change the caption shape — KamariFlow / older wizard
  versions read the same format.
- The tour uses `tourId: 'harness_list_v2'`. Bumping it to v3 would
  re-show the tour to every existing user.

## Canonical helpers used (from lib/)
- `lib/theme` — `useTheme`, `Theme` type.
- `lib/haptics`, `lib/imageUrl`, `lib/supabase` — `STORAGE_BUCKETS`.
- `components/TourGuide` — `TourGuide`, `TourStep`.
- `components/ScaffoldHelpSheet` — `HelpIcon`, `useScaffoldHelpSheet`.
- `components/inputs/FloatingLabelInput`.
- `components/primitives/A11yText`.
