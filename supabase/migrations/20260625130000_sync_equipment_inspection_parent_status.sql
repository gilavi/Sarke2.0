-- Backfill: sync the parent public.inspections row's status/completed_at from
-- each equipment <type>_inspections table.
--
-- makeInspectionService.complete()/reopen() historically updated ONLY the
-- equipment row, leaving the shared parent public.inspections row (same id)
-- stuck at status='draft'. Every unified inspection feed reads the parent —
-- Home/History `inspectionsApi.recent`, the get_project_inspections_unified RPC,
-- and the project-detail list all key off `inspections.status` — so completed
-- equipment inspections never surfaced anywhere. See docs/reports/BUG_REPORT.md
-- ("Completed equipment inspections missing from inspection feeds").
--
-- Ongoing sync is now done app-side in lib/inspection/service.ts (`syncParent`).
-- This one-time backfill repairs rows completed/reopened before that fix. The
-- parent freeze trigger (20260623150000) admits both transitions this performs
-- (draft->completed, and the owner reopen shape status='draft'+completed_at=null),
-- so it does not block the backfill. Idempotent.

do $$
declare
  t text;
begin
  foreach t in array array[
    'bobcat_inspections',
    'excavator_inspections',
    'general_equipment_inspections',
    'cargo_platform_inspections',
    'safety_net_inspections',
    'mobile_ladder_inspections',
    'fall_protection_inspections',
    'lifting_accessories_inspections',
    'forklift_inspections'
  ] loop
    -- inspections.status is the questionnaire_status enum; the equipment tables
    -- store status as text. Cast on assignment, and compare as text so the
    -- `is distinct from` guard does not error on the enum/text mismatch.
    execute format($f$
      update public.inspections i
         set status = e.status::public.questionnaire_status,
             completed_at = e.completed_at
        from public.%I e
       where e.id = i.id
         and (i.status::text is distinct from e.status
              or i.completed_at is distinct from e.completed_at)
    $f$, t);
  end loop;
end $$;
