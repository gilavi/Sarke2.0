-- ============================================================================
-- create_equipment_inspection — atomic parent-row creation for equipment types.
--
-- The 2026-05-27 inspection-identity unification gives every equipment-type
-- inspection a parent row in public.inspections (keyed by the same UUID).
-- Going forward, every new equipment inspection must insert into both tables.
--
-- This RPC handles the parent insert. The application then inserts into the
-- per-type equipment table using the same UUID. Supabase's client does not
-- expose true cross-table transactions, so the pattern is:
--   1) call this RPC → parent row created (idempotent via ON CONFLICT)
--   2) insert into <type>_inspections with that same UUID
-- If step 2 fails the parent row stays — a small orphan, cleanable up by the
-- verification queries in INSPECTION_ARCHITECTURE_NOTES.md if it accumulates.
--
-- Idempotent: ON CONFLICT (id) DO NOTHING. Safe to retry.
-- SECURITY INVOKER: runs as the calling user, so RLS still applies to the
--   inspections INSERT (the `insp owner` policy gates user_id = auth.uid()).
-- search_path pinned per the project convention (see CLAUDE.md).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_equipment_inspection(
  p_type        text,
  p_id          uuid,
  p_project_id  uuid,
  p_user_id     uuid,
  p_template_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.inspections (
    id, type, project_id, template_id, user_id, status, created_at, updated_at
  )
  VALUES (
    p_id, p_type, p_project_id, p_template_id, p_user_id, 'draft', now(), now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN p_id;
END
$$;

-- Allow authenticated clients (the only callers) to invoke it.
GRANT EXECUTE ON FUNCTION public.create_equipment_inspection(text, uuid, uuid, uuid, uuid)
  TO authenticated;
