-- get_overdue_counts() — fast per-project overdue badge counts.
--
-- Replaces the projects-screen pattern of fetching all completed inspections +
-- briefings + templates client-side just to derive the "⚠ N ვადაგადაცილებული"
-- badge. Cold-start on TestFlight was firing three full-table SELECTs
-- (useAllInspections / useAllBriefings / useTemplates) competing with the
-- actual projects list for bandwidth.
--
-- Overdue rule mirrors lib/calendarSchedule.ts: a completion is "overdue" when
-- (latest completed_at) + 10 days < today, for each (project, template) group
-- of inspections and each project's most recent briefing. Per-user schedule
-- *overrides* (set on early completion) still live in AsyncStorage and only
-- affect the project-detail screen; for the badge, the server-side
-- approximation is what matters and is what the client previously computed
-- without overrides anyway (override === nextDueDate in calendarSchedule.ts).
--
-- RLS on `inspections` + `briefings` scopes results to the calling user, so
-- SECURITY INVOKER is sufficient. search_path pinned per CLAUDE.md.

-- Composite index so the per-group "latest completion" lookup is index-only.
create index if not exists idx_inspections_project_template_completed
  on inspections (project_id, template_id, completed_at desc)
  where status = 'completed' and completed_at is not null;

-- Briefings overdue lookup: latest completed per project by date_time.
create index if not exists idx_briefings_project_completed
  on briefings (project_id, date_time desc)
  where status = 'completed';

create or replace function public.get_overdue_counts()
returns table (
  project_id    uuid,
  overdue_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  with latest_inspections as (
    select distinct on (i.project_id, i.template_id)
      i.project_id,
      i.completed_at
    from inspections i
    where i.status = 'completed'
      and i.completed_at is not null
    order by i.project_id, i.template_id, i.completed_at desc
  ),
  latest_briefings as (
    select distinct on (b.project_id)
      b.project_id,
      b.date_time as completed_at
    from briefings b
    where b.status = 'completed'
    order by b.project_id, b.date_time desc
  ),
  overdue as (
    select project_id from latest_inspections
     where (completed_at::date + interval '10 days') < current_date
    union all
    select project_id from latest_briefings
     where (completed_at::date + interval '10 days') < current_date
  )
  select project_id, count(*)::bigint as overdue_count
    from overdue
   group by project_id;
$$;

grant execute on function public.get_overdue_counts() to authenticated;
