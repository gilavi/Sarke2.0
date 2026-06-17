# harness-list

## What this module does
Full-screen "kamari" inspection takeover used by the inspection wizard
when a harness `component_grid` question (rows starting with `N1`) is
reached. Step 1 picks how many belts to inspect (`QuantitySelector`),
step 2 walks one belt at a time through a checklist — each component is
a flag-only ✓ (გამართული) / ✗ (დაზიანებული) toggle. **No per-row note
or photo**; problem detail + photos belong on the conclusion step.

The header is the shared `FlowHeader` (circular back/close, centered
title + project subtitle, ink progress bar + `step / total` counter) —
rendered *inside* this component so its back/close can flush the draft.

Rendered by `features/inspection-wizard/InspectionWizard.tsx` and
`app/inspections/harness/[id].tsx`.

## Public API (from index.ts)
- `HarnessListFlow` — the full-screen component. **Requires an
  `inspectionId` prop** (keys the session position cache), plus
  `project`, `stepIndex`/`totalSteps` (header counter), and
  `onBack`/`onClose`/`onConclude`.
- `HarnessListFlowProps` — its props.

`components/HarnessListFlow.tsx` kept as a 1-line barrel so existing
imports `from '../components/HarnessListFlow'` keep resolving.

## Internal files
- `HarnessListFlow.tsx` — the orchestrator. Owns `step ('count' |
  'list')`, `currentRowIdx`, a **local `draft`** of grid values
  (row→col→value, keyed by question id, seeded once from `answers`),
  and the mutation/nav callbacks (`handleSet`, `confirmCurrentRow`,
  `flush`). Renders `FlowHeader` + a `ChipNavStrip` (belt jump-nav) +
  a `ChecklistLegend` + the rows; "დადასტურება →" advances linearly.
  Header back is hierarchical: list → count → exit (via `onBack`).
- `ChipRow.tsx` — thin adapter mapping `(item, row, state)` onto the
  shared `ChecklistItemRow` (2-option ✓/✗). `memo`'d with a custom
  comparator so only the touched row re-renders.
- `_shared.ts` — `HarnessItem` type + pure helpers (`buildItems`,
  `rowLabelsFor`, `cellState`, `readComment`, `captionFor`). Some are
  now only used by other callers (Kamari / older wizard).
- `styles.ts` — `gets(theme)` factory (footer + CTA only now).

## Gotchas / non-obvious things
- **Edits are local until you advance/leave.** ✓/✗ taps mutate the
  in-memory `draft` only — they do NOT call `onPatchAnswer` per tap
  (doing so re-rendered the parent wizard and reloaded the screen).
  `flush()` persists the whole draft in one batch, called on
  **conclude** (last belt's "დადასტურება →") and on **close/exit**
  (`handleClose`/`handleExit`). Advancing belts + chip-jumping are
  purely local. Trade-off: a hard app-kill mid-flow loses unsaved rows.
- **Rows start neutral.** Unlike the old default-to-✓ behavior, a row
  shows neither chip filled until tapped. The legal-PDF invariant
  (every cell has a value) is preserved by `buildAutoOkSnapshot`, which
  fills every untouched cell as `ok` on confirm.
- **Position cache.** `step`/`currentRowIdx` are mirrored into a
  module-level `flowPos` Map keyed by `inspectionId`, restored on
  mount — so an unexpected remount restores the user's place.
- Read state from the draft via `draftStateOf`, not `cellState` (that
  still exists in `_shared` for other callers, reading persisted
  `answers`).
- `draftStateOf` reads `'bad'`/`'ok'` AND legacy `'დაზიანებულია'`/`'ვარგისია'`
  — older inspections wrote the Georgian strings. Don't normalize on
  read; the PDF/results screens still read the original values.

## Canonical helpers used (from lib/ + components)
- `lib/theme` — `useTheme`, `Theme` type. `lib/haptics`.
- `lib/shared/documentName` — `inspectionDisplayName` (header title).
- `components/FlowHeader` — the shared header.
- `components/inspection-parts/ChecklistItemRow` (via `ChipRow`),
  `ChecklistLegend`, `ChipNavStrip`.
- `components/ScaffoldHelpSheet` — `useScaffoldHelpSheet` (the row "?"
  opens the component help sheet).
- `components/inputs/QuantitySelector` — the count picker.
- `components/primitives/A11yText`.
