-- ============================================================================
-- Unify inspection identity across all 10 inspection types.
--
-- Problem: equipment-type inspections (bobcat, excavator, general_equipment,
-- cargo_platform, safety_net, mobile_ladder, forklift, fall_protection,
-- lifting_accessories) store rows in their own <type>_inspections tables, but
-- shared tables — currently only `inspection_attachments`, possibly more per
-- the live-FK check in INSPECTION_ARCHITECTURE_NOTES.md §1C — FK to
-- public.inspections.id only. This blocks features like equipment-cert
-- attachments and any future cross-cutting concern from working uniformly
-- across all 10 types.
--
-- Fix: every equipment inspection row also has a parent row in
-- public.inspections with the same UUID. Equipment-specific data stays in
-- the equipment table; common metadata lives in the parent. A new
-- `inspections.type` column tags the variant.
--
-- Properties:
--   * Idempotent — every step is guarded with IF NOT EXISTS / ON CONFLICT
--     / NOT IN, so re-running is a no-op.
--   * Transactional — wrapped in BEGIN/COMMIT; partial failure rolls back.
--   * Backward-compatible — equipment-table reads are unaffected; the
--     application keeps writing to equipment tables (Phase 3 of the
--     2026-05-27 session wraps the equipment-table insert with a parent-row
--     insert via the create_equipment_inspection RPC).
--
-- IMPORTANT — DO NOT RUN UNATTENDED. Claude Code does NOT execute this.
-- Before applying:
--   1) Run the [LIVE-DB] queries in INSPECTION_ARCHITECTURE_NOTES.md §1A–§1C
--      to confirm the live schema matches the assumptions below.
--   2) Verify the collision check (§1B last query) returns 0 for every
--      type — equipment ids must not already exist in public.inspections.
--   3) Take a backup.
--   4) Apply via `supabase db query --linked` or the Supabase Management API.
--   5) Apply the companion RPC migration written by Phase 3 of the same
--      session: 20260527001241_create_equipment_inspection_rpc.sql.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Add `inspections.type` column (tags which variant a parent row is).
--         Backfill from templates.category for existing rows; default 'harness'
--         only when no template association exists.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inspections' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.inspections ADD COLUMN type text;
    UPDATE public.inspections i
       SET type = COALESCE(t.category, 'harness')
      FROM public.templates t
     WHERE t.id = i.template_id
       AND i.type IS NULL;
    UPDATE public.inspections SET type = 'harness' WHERE type IS NULL;
    ALTER TABLE public.inspections ALTER COLUMN type SET NOT NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Backfill parent rows in public.inspections for each equipment type.
--         One INSERT per type so the `type` column is correctly tagged and
--         the per-type template-id fallback can use the well-known UUID for
--         rows whose template_id is null.
--
-- Column list rationale (per §1E of the notes):
--   id, project_id, user_id, status, created_at, updated_at, completed_at —
--     all direct copies.
--   template_id — COALESCE(equipment.template_id, '<TYPE_TEMPLATE_UUID>').
--                 inspections.template_id is NOT NULL but equipment tables
--                 allow null.
--   type — hardcoded per INSERT.
--   inspector_name — copied where the equipment table has the column;
--                    null for fall_protection which lacks it.
--   harness_name, notes, conclusion_text, is_safe_for_use, department,
--   conclusion_photo_paths — equipment types track these in their own
--                            payload-specific columns; leave null/default
--                            on the parent.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.inspections
  (id, type, project_id, template_id, user_id, status,
   inspector_name, created_at, updated_at, completed_at)
SELECT
  b.id, 'bobcat', b.project_id,
  COALESCE(b.template_id, '33333333-3333-3333-3333-333333333333'::uuid),
  b.user_id, b.status::questionnaire_status,
  b.inspector_name, b.created_at, b.updated_at, b.completed_at
FROM public.bobcat_inspections b
WHERE b.id NOT IN (SELECT id FROM public.inspections)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inspections
  (id, type, project_id, template_id, user_id, status,
   inspector_name, created_at, updated_at, completed_at)
SELECT
  e.id, 'excavator', e.project_id,
  COALESCE(e.template_id, '55555555-5555-5555-5555-555555555555'::uuid),
  e.user_id, e.status::questionnaire_status,
  e.inspector_name, e.created_at, e.updated_at, e.completed_at
FROM public.excavator_inspections e
WHERE e.id NOT IN (SELECT id FROM public.inspections)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inspections
  (id, type, project_id, template_id, user_id, status,
   inspector_name, created_at, updated_at, completed_at)
SELECT
  g.id, 'general_equipment', g.project_id,
  COALESCE(g.template_id, '66666666-6666-6666-6666-666666666666'::uuid),
  g.user_id, g.status::questionnaire_status,
  g.inspector_name, g.created_at, g.updated_at, g.completed_at
FROM public.general_equipment_inspections g
WHERE g.id NOT IN (SELECT id FROM public.inspections)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inspections
  (id, type, project_id, template_id, user_id, status,
   inspector_name, created_at, updated_at, completed_at)
SELECT
  c.id, 'cargo_platform', c.project_id,
  COALESCE(c.template_id, '77777777-7777-7777-7777-777777777777'::uuid),
  c.user_id, c.status::questionnaire_status,
  c.inspector_name, c.created_at, c.updated_at, c.completed_at
FROM public.cargo_platform_inspections c
WHERE c.id NOT IN (SELECT id FROM public.inspections)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inspections
  (id, type, project_id, template_id, user_id, status,
   inspector_name, created_at, updated_at, completed_at)
SELECT
  s.id, 'safety_net_inspection', s.project_id,
  COALESCE(s.template_id, '88888888-8888-8888-8888-888888888888'::uuid),
  s.user_id, s.status::questionnaire_status,
  s.inspector_name, s.created_at, s.updated_at, s.completed_at
FROM public.safety_net_inspections s
WHERE s.id NOT IN (SELECT id FROM public.inspections)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inspections
  (id, type, project_id, template_id, user_id, status,
   inspector_name, created_at, updated_at, completed_at)
SELECT
  m.id, 'mobile_ladder_inspection', m.project_id,
  COALESCE(m.template_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
  m.user_id, m.status::questionnaire_status,
  m.inspector_name, m.created_at, m.updated_at, m.completed_at
FROM public.mobile_ladder_inspections m
WHERE m.id NOT IN (SELECT id FROM public.inspections)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inspections
  (id, type, project_id, template_id, user_id, status,
   inspector_name, created_at, updated_at, completed_at)
SELECT
  f.id, 'forklift_inspection', f.project_id,
  COALESCE(f.template_id, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),
  f.user_id, f.status::questionnaire_status,
  f.inspector_name, f.created_at, f.updated_at, f.completed_at
FROM public.forklift_inspections f
WHERE f.id NOT IN (SELECT id FROM public.inspections)
ON CONFLICT (id) DO NOTHING;

-- Fall-protection lacks an inspector_name column on the equipment table;
-- the parent row stores null. Other shared fields copy as usual.
INSERT INTO public.inspections
  (id, type, project_id, template_id, user_id, status,
   created_at, updated_at, completed_at)
SELECT
  fp.id, 'fall_protection_inspection', fp.project_id,
  COALESCE(fp.template_id, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid),
  fp.user_id, fp.status::questionnaire_status,
  fp.created_at, fp.updated_at, fp.completed_at
FROM public.fall_protection_inspections fp
WHERE fp.id NOT IN (SELECT id FROM public.inspections)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inspections
  (id, type, project_id, template_id, user_id, status,
   inspector_name, created_at, updated_at, completed_at)
SELECT
  la.id, 'lifting_accessories_inspection', la.project_id,
  COALESCE(la.template_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
  la.user_id, la.status::questionnaire_status,
  la.inspector_name, la.created_at, la.updated_at, la.completed_at
FROM public.lifting_accessories_inspections la
WHERE la.id NOT IN (SELECT id FROM public.inspections)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Add FK <type>_inspections.id → inspections.id ON DELETE CASCADE.
--         Iterated via DO block so all 9 types pick up the same shape.
--         Idempotent — DROP IF EXISTS first.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  eq_type text;
  fk_name text;
BEGIN
  FOREACH eq_type IN ARRAY ARRAY[
    'bobcat', 'excavator', 'general_equipment', 'cargo_platform',
    'safety_net', 'mobile_ladder', 'forklift', 'fall_protection',
    'lifting_accessories'
  ] LOOP
    fk_name := eq_type || '_inspections_id_inspections_fkey';
    EXECUTE format(
      'ALTER TABLE public.%I_inspections DROP CONSTRAINT IF EXISTS %I',
      eq_type, fk_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I_inspections ADD CONSTRAINT %I FOREIGN KEY (id) REFERENCES public.inspections(id) ON DELETE CASCADE',
      eq_type, fk_name
    );
  END LOOP;
END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification queries (NOT executed by the migration — run manually after
-- applying). Expect 0 orphans per type and a sensible type distribution.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- SELECT 'bobcat' AS type, count(*) AS orphans FROM public.bobcat_inspections b
--   WHERE NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = b.id)
-- UNION ALL SELECT 'excavator', count(*) FROM public.excavator_inspections b
--   WHERE NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = b.id)
-- UNION ALL SELECT 'general_equipment', count(*) FROM public.general_equipment_inspections b
--   WHERE NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = b.id)
-- UNION ALL SELECT 'cargo_platform', count(*) FROM public.cargo_platform_inspections b
--   WHERE NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = b.id)
-- UNION ALL SELECT 'safety_net', count(*) FROM public.safety_net_inspections b
--   WHERE NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = b.id)
-- UNION ALL SELECT 'mobile_ladder', count(*) FROM public.mobile_ladder_inspections b
--   WHERE NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = b.id)
-- UNION ALL SELECT 'forklift', count(*) FROM public.forklift_inspections b
--   WHERE NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = b.id)
-- UNION ALL SELECT 'fall_protection', count(*) FROM public.fall_protection_inspections b
--   WHERE NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = b.id)
-- UNION ALL SELECT 'lifting_accessories', count(*) FROM public.lifting_accessories_inspections b
--   WHERE NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = b.id);
--
-- SELECT type, count(*) FROM public.inspections GROUP BY type ORDER BY type;
