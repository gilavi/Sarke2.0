# inspection-steps

## What this module does
The reusable shell + step components used by every equipment-specific
inspection route (bobcat, excavator, cargo platform, etc.) and by
the harness inspection. Previously `components/inspections/`;
renamed in Phase 1 to clarify its role vs `inspection-parts/`.

## Public API (from index.ts)
- `InspectionShell` — full-screen wrapper (FlowHeader + progress,
  WizardStepTransition, saving hint, optional `banner` slot, and the
  footer next/skip/finish button). EVERY equipment route wraps its
  step content in this. Key props: `step` (0-based — the shell adds
  +1 for the header counter), `isLastStep`, `finishLabel` (custom
  finish-button text), `blockNext` (disable the non-last button while
  `canGoNext` is false — no skip), `showPdfIcon`/`generatingPdf`/`onPdf`
  (PDF icon shown beside the close ✕), `banner` (e.g. PdfLockedBanner).
- `ProjectPickerStep` — initial step where the user picks the
  project + project item the inspection is attached to.
- `ChecklistStep` — generic "list of checks" step (1/2/3 verdict per
  row, with comments and photos). Manages scroll state + section
  headers; delegates row rendering to `ChecklistRow`.
- `ConclusionStep` — final step with safety verdict + conclusion
  text + signatures.

## Internal files
- `InspectionShell.tsx`, `ProjectPickerStep.tsx`
- `ChecklistStep.tsx` (88 lines) — scroll container + section headers.
- `ChecklistRow.tsx` (185 lines) — single checklist row: verdict
  buttons 1/2/3, comment toggle, photo badge, inline comment input.
  Also owns the exported item types (re-exported via ChecklistStep).
- `ConclusionStep.tsx`

## Gotchas / non-obvious things
- This is the equipment-route shell, NOT the generic harness wizard.
  The generic wizard lives at `features/inspection-wizard/`.
  Equipment routes (bobcat, excavator, ...) own their own step
  arrays + state and use these step components as reusable
  building blocks.
- `ChecklistStep` re-exports `ChecklistItem` / `ChecklistItemState` /
  `ChecklistResult` from `ChecklistRow` for backward compatibility.
  Changing these types is a breaking change for every equipment route.
- Verdict buttons use **numbers** (1=good, 2=deficient, 3=unusable)
  throughout — do not change to symbols. The PDF renderer and the
  `bobcatSchema` legend also use 1/2/3 to match.

## Canonical helpers used
- `components/inspection-parts` — the smaller atoms.
- `lib/theme`, `lib/haptics`, `lib/services`.
