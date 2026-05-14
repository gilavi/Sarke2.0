-- Performance: aggregate inspection counts without full-table scans.
--
-- get_inspection_stats() replaces the JS client-side SELECT + loop in
-- projectsApi.stats(). One DB round-trip with a GROUP BY is orders of
-- magnitude faster than fetching every inspection row and summing in JS.
--
-- Composite indexes let both this function and inspectionsApi.counts()
-- (which uses COUNT with a WHERE clause) hit index-only scans.

-- Composite index for per-user status filtering (counts() + stats())
create index if not exists idx_inspections_user_status
  on inspections (user_id, status);

-- Composite index for per-user recency lookup (counts() latestCreatedAt)
create index if not exists idx_inspections_user_created
  on inspections (user_id, created_at desc);

-- RPC: returns one row per project_id with draft and completed counts.
-- Callable by authenticated users; RLS on `inspections` limits rows to
-- the caller's own data, so no explicit user_id filter is needed.
create or replace function get_inspection_stats()
returns table (
  project_id  uuid,
  drafts      bigint,
  completed   bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    project_id,
    count(*) filter (where status = 'draft')     as drafts,
    count(*) filter (where status = 'completed') as completed
  from inspections
  group by project_id;
$$;

grant execute on function get_inspection_stats() to authenticated;
