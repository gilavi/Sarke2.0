-- Fix reports UPDATE RLS policy.
--
-- The original UPDATE policy used:
--   USING (exists (select 1 from projects p
--                   where p.id = reports.project_id
--                     and p.user_id = auth.uid()))
--
-- This is the same fragile sub-query pattern fixed for INSERT in 0044.
-- When auth.uid() is momentarily unresolvable (token-refresh race) the
-- sub-query returns no rows and the update is blocked — observed as
-- "new row violates row-level security policy" when uploading a report
-- slide image (addReportSlide updates the reports.slides JSONB column).
--
-- Fix: check only user_id = auth.uid(), consistent with INSERT (0044)
-- and the orders table pattern (0038).

drop policy if exists "reports owner update" on reports;

create policy "reports owner update" on reports
  for update to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
