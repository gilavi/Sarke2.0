-- Fix reports INSERT RLS policy.
--
-- The original policy required an exists(select … from projects) sub-query
-- inside the WITH CHECK clause.  That sub-query runs under the caller's RLS
-- context; if auth.uid() is momentarily unresolvable (e.g. a race between
-- token refresh and the INSERT) the sub-query returns no rows, the check
-- evaluates to FALSE, and Postgres raises "new row violates row-level
-- security policy" even though the user genuinely owns the project.
--
-- The project-ownership check is redundant:
--   • listProjects() only returns projects the user owns (SELECT RLS).
--   • The client sets user_id = auth.uid() explicitly.
--   • project_id is a FK — a non-existent project_id is caught by the
--     foreign-key constraint before RLS runs.
--
-- Align with the simpler pattern used by orders (migration 0038).

drop policy if exists "reports owner insert" on reports;

create policy "reports owner insert" on reports
  for insert to authenticated
  with check (user_id = auth.uid());
