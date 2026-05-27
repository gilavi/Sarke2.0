-- get_project_inspections_unified() — single-query replacement for the 10
-- parallel per-type inspection fetches the project-detail screen used to fire.
--
-- After 20260527001240_unify_inspection_identity.sql, every equipment-type
-- inspection (bobcat, excavator, …) has a parent row in public.inspections
-- with the same UUID and a `type` column tagging the variant. Generic
-- inspection types ('harness', 'xaracho', 'mobile_scaffold', 'mobile_scaffold_n3')
-- also live in this same table. So a single SELECT against public.inspections
-- returns every inspection that should appear on the project-detail screen.
--
-- The screen only needs id + source + template_id + status + created_at for
-- its preview rows (full equipment payload — items, signatures, etc. — is
-- never read on this screen). This shape is ~30 bytes per row, vs the
-- multi-KB rows the per-type queries used to pull.
--
-- RLS on inspections scopes results to the calling user (insp owner policy
-- → user_id = auth.uid()), so SECURITY INVOKER is sufficient. search_path
-- pinned per CLAUDE.md.

-- Composite index — drives the per-project lookup + the order-by-created_at
-- the RPC does. Idempotent.
create index if not exists idx_inspections_project_created
  on inspections (project_id, created_at desc);

create or replace function public.get_project_inspections_unified(p_project_id uuid)
returns table (
  id          uuid,
  source      text,
  template_id uuid,
  status      text,
  created_at  timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    i.id,
    i.type as source,
    i.template_id,
    i.status::text,
    i.created_at
  from inspections i
  where i.project_id = p_project_id
  order by i.created_at desc;
$$;

grant execute on function public.get_project_inspections_unified(uuid) to authenticated;
