# Refactor Notes

Bugs/oddities spotted during the structural refactor — captured here instead
of fixed inline (structural-only constraint).

## Pre-existing bugs

### `features/inspection-wizard/GridRowStep.tsx` — conditional hook calls ✅ FIXED in v2 Phase 3
Split into `HarnessRowStep.tsx` + `ScaffoldRowStep.tsx`; the dispatch
on `grid_rows[0] === 'N1'` moved up to `InspectionWizard.tsx`. Each
new file calls its hooks unconditionally. AGENTS.md updated with the
rule that future grid variants must follow the same pattern.

### `app/orders/new.tsx` — dead step components dropped
The original `NewOrderScreen` declared but never rendered
`StepSignDirector`, `StepSignAppointed`, and `StepSignCraneOperator`.
The fire-safety / crane flows render `StepSignaturesFireSafety` and
`StepSignaturesCrane` (the combined two-signature steps) instead.
Not carried over into `features/order-new/` since they had no callers.

### `features/inspection-wizard/MeasureInput.tsx` — unused styles factory ✅ FIXED in v2 Phase 1
`useMemo(() => getstyles(theme), [theme])` was called and discarded.
Removed.
