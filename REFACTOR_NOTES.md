# Refactor Notes

Bugs/oddities spotted during the structural refactor — captured here instead
of fixed inline (structural-only constraint).

## Pre-existing bugs

### `features/inspection-wizard/GridRowStep.tsx` — conditional hook calls
The non-harness branch (`if (!isHarness) { ... }`) calls `useState` and
`useRef` after a conditional `return`. This violates the rules of hooks
and was present in the original god-file
(`app/inspections/[id]/wizard.tsx`, `GridRowStep`). Latent because the
parent (`WizardStepTransition`) unmounts/remounts on each step, so
`isHarness` is stable for the life of any one mount — but a future
refactor that keeps the same `GridRowStep` mounted across step
transitions would crash. Fix would be to split into `HarnessRowStep` +
`ScaffoldRowStep` components.

### `features/inspection-wizard/MeasureInput.tsx` — unused styles factory
`useMemo(() => getstyles(theme), [theme])` is called and the result
discarded. Inherited from the original; left in for byte-for-byte
behavior parity but safe to delete.
