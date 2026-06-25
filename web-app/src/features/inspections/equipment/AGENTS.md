# features/inspections/equipment — AGENTS.md

> **Reduced to shared widgets.** The legacy per-type equipment flow (the four
> *Detail.tsx pages, useEquipmentDetail, CompletedBanner, InspectionPdfOverlay) and
> the per-type New*Inspection / *Print pages were deleted once all equipment acts
> moved to the unified engine (features/inspections/structured + lib/inspection).
> Only the two shared checklist widgets remain here.

## What this module does

Holds the two presentational checklist widgets reused by the unified structured
wizard (features/inspections/structured/steps/ChecklistStep):

-  — one checklist row: numbered label +
  description with a SegmentedControl on the right and, once a result is chosen,
  an uncontrolled comment field + photo drop zone. Generic over the result enum.
-  — the  /  types + a
  pill-row selector.  imports its types from here.

## Gotchas
- These are pure presentationals — no data fetching. Keep them that way.
- Result tone → color mapping lives in ; pass  through,
  do not hardcode emerald/amber/red.
