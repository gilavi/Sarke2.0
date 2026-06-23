# lib/documents

## What this module does
Cross-document orchestration that doesn't belong to any single
record service. Today it owns the **reopen-for-edit** flow shared by
every finished-document family (inspection Acts, reports, orders,
incidents, briefings).

## Public API
- `reopenDocument(target, queryClient)` — `lib/documents/reopen.ts`.
  Un-completes a finished document back to `draft` so the EXISTING
  create/wizard/edit flow can edit it, then calls
  `invalidateRecordLists(qc)`. `target` is a discriminated union
  (`ReopenTarget`): `genericInspection | equipmentInspection | report
  | order | incident | briefing`. The caller then routes into the
  matching create/edit screen; re-completion happens through each
  family's normal completion path (which regenerates the PDF and, for
  inspections, re-captures the in-memory signature).

## Internal files
- `reopen.ts` — the dispatcher. Only ever writes `status -> 'draft'`
  (+ `completed_at -> null` for inspections); never audit fields.

## Gotchas
- **Two inspection regimes.** Generic inspections (harness/xaracho)
  store "completed" on the parent `public.inspections` row and are
  guarded by the freeze trigger — relaxed by
  `supabase/migrations/20260623150000_allow_inspection_reopen.sql` to
  admit exactly `status=draft` + `completed_at=null`. Equipment types
  (bobcat, …) store status on their own `<type>_inspections` table
  (unfrozen); reopen them via the per-type service from
  `lib/inspection/registry.ts` (`entry.reopen(id)`), keyed by
  `template.category` / `InspectionSource`. Flipping the wrong table
  is a silent no-op against the result view.
- **Schedule double-advance.** Reopen nulls `completed_at`; the same
  migration tightens `advance_schedule_on_complete()` so re-completing
  a reopened inspection advances `schedules.next_due_at` only on the
  true draft→completed rising edge (a correction is not a new event).
- **Online-only.** Reopen is a direct online write (like delete), not
  routed through the offline `questionnaire_update` queue, so a stale
  `status:'completed'` flush can't race it.
- **Signatures.** Captured inspection signatures are never persisted;
  re-signing happens naturally on the result screen after re-complete.

## Canonical helpers it consumes
- `inspectionsApi.update`, `incidentsApi.update`, `reportsApi.update`
  (from `lib/services`), `ordersApi.update`, `briefingsApi.update`.
- `inspectionRegistry` (`lib/inspection/registry.ts`) for equipment
  reopen.
- `invalidateRecordLists` (`lib/apiHooks.ts`).
- `InspectionSource` / `routeForInspection` (`lib/inspectionRouting.ts`)
  for the edit-entry-point routing.
