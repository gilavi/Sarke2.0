-- Sarke 2.0 — Pre-flight read-only checks for inspections architecture migration
-- READ-ONLY. Every block is a SELECT. Do not modify.
-- Run each block in Supabase Studio → SQL Editor and copy the result back
-- into the matching section of PRE_FLIGHT_OUTPUT.md.


-- =====================================================================
-- Query 0.1 — inspections table schema
-- =====================================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inspections'
ORDER BY ordinal_position;


-- =====================================================================
-- Query 0.2 — equipment tables exist
-- =====================================================================
SELECT table_name, count(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN (
  'bobcat_inspections','excavator_inspections','general_equipment_inspections',
  'cargo_platform_inspections','safety_net_inspections','mobile_ladder_inspections',
  'forklift_inspections','fall_protection_inspections','lifting_accessories_inspections'
)
GROUP BY table_name
ORDER BY table_name;


-- =====================================================================
-- Query 0.3 — row counts per equipment type
-- =====================================================================
SELECT 'bobcat' AS type, count(*) FROM public.bobcat_inspections
UNION ALL SELECT 'excavator', count(*) FROM public.excavator_inspections
UNION ALL SELECT 'general_equipment', count(*) FROM public.general_equipment_inspections
UNION ALL SELECT 'cargo_platform', count(*) FROM public.cargo_platform_inspections
UNION ALL SELECT 'safety_net', count(*) FROM public.safety_net_inspections
UNION ALL SELECT 'mobile_ladder', count(*) FROM public.mobile_ladder_inspections
UNION ALL SELECT 'forklift', count(*) FROM public.forklift_inspections
UNION ALL SELECT 'fall_protection', count(*) FROM public.fall_protection_inspections
UNION ALL SELECT 'lifting_accessories', count(*) FROM public.lifting_accessories_inspections;


-- =====================================================================
-- Query 0.4 — CRITICAL: ID collision check
-- Pass criteria: every row returns 0
-- =====================================================================
SELECT 'bobcat' AS type, count(*) AS collisions FROM public.bobcat_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'excavator', count(*) FROM public.excavator_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'general_equipment', count(*) FROM public.general_equipment_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'cargo_platform', count(*) FROM public.cargo_platform_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'safety_net', count(*) FROM public.safety_net_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'mobile_ladder', count(*) FROM public.mobile_ladder_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'forklift', count(*) FROM public.forklift_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'fall_protection', count(*) FROM public.fall_protection_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'lifting_accessories', count(*) FROM public.lifting_accessories_inspections WHERE id IN (SELECT id FROM public.inspections);


-- =====================================================================
-- Query 0.5 — FK surface to inspections.id
-- Pass criteria: at least inspection_attachments_inspection_id_fkey present
-- =====================================================================
SELECT c.relname AS source_table, con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_class rc ON con.confrelid = rc.oid
JOIN pg_namespace rn ON rc.relnamespace = rn.oid
WHERE n.nspname = 'public'
  AND con.contype = 'f'
  AND rn.nspname = 'public'
  AND rc.relname = 'inspections';
