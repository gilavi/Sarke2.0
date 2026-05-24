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

### `app/orders/new.tsx` — dead step components dropped
The original `NewOrderScreen` declared but never rendered
`StepSignDirector`, `StepSignAppointed`, and `StepSignCraneOperator`.
The fire-safety / crane flows render `StepSignaturesFireSafety` and
`StepSignaturesCrane` (the combined two-signature steps) instead.
Not carried over into `features/order-new/` since they had no callers.

### `features/inspection-wizard/MeasureInput.tsx` — unused styles factory ✅ FIXED in v2 Phase 1
`useMemo(() => getstyles(theme), [theme])` was called and discarded.
Removed.
