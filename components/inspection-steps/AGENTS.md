# inspection-steps

## What this module does
The reusable shell + step components used by every equipment-specific
inspection route (bobcat, excavator, cargo platform, etc.) and by
the harness inspection. Previously `components/inspections/`;
renamed in Phase 1 to clarify its role vs `inspection-parts/`.

## Public API (from index.ts)
- `InspectionShell` — full-screen wrapper (header, footer, progress).
  Equipment routes wrap their step content in this to share keyboard
  handling, sync pill, and the back/close affordance.
- `ProjectPickerStep` — initial step where the user picks the
  project + project item the inspection is attached to.
- `ChecklistStep` — generic "list of checks" step (yes/no per row,
  with comments and photos).
- `ConclusionStep` — final step with safety verdict + conclusion
  text + signatures.

## Internal files
- `InspectionShell.tsx`, `ProjectPickerStep.tsx`, `ChecklistStep.tsx`,
  `ConclusionStep.tsx`.

## Gotchas / non-obvious things
- This is the equipment-route shell, NOT the generic harness wizard.
  The generic wizard lives at `features/inspection-wizard/`.
  Equipment routes (bobcat, excavator, ...) own their own step
  arrays + state and use these step components as reusable
  building blocks.
- `ChecklistStep` exports `ChecklistItem` / `ChecklistItemState` /
  `ChecklistResult` types that equipment route reducers cast to —
  changing them is a breaking change for every equipment route.

## Canonical helpers used
- `components/inspection-parts` — the smaller atoms.
- `lib/theme`, `lib/haptics`, `lib/services`.
