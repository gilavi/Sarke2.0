-- get_inspection_stats() — per-project draft/completed counts for the projects list.
-- SECURITY INVOKER so RLS applies automatically (user sees only their own inspections).
CREATE OR REPLACE FUNCTION public.get_inspection_stats()
RETURNS TABLE(project_id uuid, drafts bigint, completed bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT
    i.project_id,
    COUNT(*) FILTER (WHERE i.status = 'draft')     AS drafts,
    COUNT(*) FILTER (WHERE i.status = 'completed') AS completed
  FROM public.inspections i
  GROUP BY i.project_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_inspection_stats() TO authenticated;
