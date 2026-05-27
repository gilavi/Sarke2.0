-- ============================================================================
-- Remove persisted inspection signatures (regulatory: signatures must not be
-- stored — they exist only to be rasterized into the generated PDF and then
-- forgotten).
--
-- IMPORTANT — DO NOT RUN UNATTENDED.
-- Claude Code does NOT execute this migration. Review the steps, take a
-- backup, then apply manually via `supabase db query --linked` or the
-- Supabase Management API.
--
-- Scope: inspection signature surface only.
-- Preserved (out of scope):
--   * project_signers + their `project/<projectId>/...` objects in the
--     `signatures` bucket (in-person witness signing flow).
--   * tokenized remote signing (`remote_signings`, `remote-signatures`
--     bucket, `send-signing-sms` Edge Function).
--   * order signatures embedded in `orders.form_data`.
--   * incident/briefing flows that read `users.saved_signature_url` →
--     `expert/<userId>.png`. The expert sig PNG and the column stay.
--
-- This migration is paired with the application-side cleanup in the
-- signature redesign commits (features/signatures/, removal of per-type
-- SignatureSheet wiring). After both land, the inspection flow holds the
-- captured PNG in component state only.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Drop the per-inspection `signatures` table (and its v2 enum).
-- ─────────────────────────────────────────────────────────────────────────────
-- Created in migration 0001_init.sql, extended in 0004_signatures_v2.sql.
-- Storage is the `signatures` bucket (which has both inspection and project
-- objects — see step 4 for the storage cleanup).
-- The `signatures_status_png_chk` constraint and all RLS policies on the
-- table are dropped automatically with the table.

DROP TABLE IF EXISTS public.signatures;
DROP TYPE  IF EXISTS public.signature_status;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Drop inline `inspector_signature` columns (base64 PNGs).
-- ─────────────────────────────────────────────────────────────────────────────
-- Added in:
--   0024_bobcat_inspections.sql
--   0026_excavator_template.sql
--   0027_general_equipment_inspection.sql
--   0032_inspections_add_signature.sql

ALTER TABLE public.inspections                   DROP COLUMN IF EXISTS inspector_signature;
ALTER TABLE public.bobcat_inspections            DROP COLUMN IF EXISTS inspector_signature;
ALTER TABLE public.excavator_inspections         DROP COLUMN IF EXISTS inspector_signature;
ALTER TABLE public.general_equipment_inspections DROP COLUMN IF EXISTS inspector_signature;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Drop `signatories` / `signatures` JSONB columns (arrays of base64 PNGs).
-- ─────────────────────────────────────────────────────────────────────────────
-- Added in:
--   0040_cargo_platform_inspection.sql (`signatures` JSONB on cargo_platform_inspections)
--   0050_inspections_add_signatories.sql
--   0051_equipment_signatories.sql

ALTER TABLE public.inspections                   DROP COLUMN IF EXISTS signatories;
ALTER TABLE public.bobcat_inspections            DROP COLUMN IF EXISTS signatories;
ALTER TABLE public.excavator_inspections         DROP COLUMN IF EXISTS signatories;
ALTER TABLE public.general_equipment_inspections DROP COLUMN IF EXISTS signatories;
ALTER TABLE public.cargo_platform_inspections    DROP COLUMN IF EXISTS signatories;
ALTER TABLE public.cargo_platform_inspections    DROP COLUMN IF EXISTS signatures;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Delete inspection signature objects from Supabase Storage.
-- ─────────────────────────────────────────────────────────────────────────────
-- Path conventions in the `signatures` bucket:
--   <inspectionId>/<role>-<ts>.png  ← INSPECTION (delete)
--   expert/<userId>.png             ← user's reusable signature, used by
--                                     incidents/briefings out of scope (keep)
--   project/<projectId>/...         ← project-signer witnesses (keep)
--
-- Filter: keep anything whose first path segment is `expert` or `project`;
-- delete everything else.
/*
DELETE FROM storage.objects
WHERE bucket_id = 'signatures'
  AND split_part(name, '/', 1) NOT IN ('expert', 'project');
*/
-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Optional — wipe in-row signature fields from JSONB columns on
--    multi-device equipment inspections (safety-net, mobile-ladder,
--    fall-protection, lifting-accessories, forklift).
-- ─────────────────────────────────────────────────────────────────────────────
-- These types embed per-device or extended signature fields inside other
-- JSONB columns (`devices`, `deviceData`, etc.). After this migration the
-- application no longer writes those fields, but old rows still contain the
-- base64 data — strictly speaking that's residual persisted state.
--
-- The exact JSONB paths differ per type, so this is left as commented SQL
-- the user can apply selectively after auditing each row schema:
--
-- UPDATE public.safety_net_inspections        SET devices = (SELECT jsonb_agg(d - 'signature') FROM jsonb_array_elements(devices) d);
-- UPDATE public.mobile_ladder_inspections     SET devices = (SELECT jsonb_agg(d - 'signature') FROM jsonb_array_elements(devices) d);
-- UPDATE public.lifting_accessories_inspections SET devices = (SELECT jsonb_agg(d - 'signature') FROM jsonb_array_elements(devices) d);
-- UPDATE public.fall_protection_inspections   SET device_data = (SELECT jsonb_agg(d - 'signature') FROM jsonb_array_elements(device_data) d);
-- UPDATE public.forklift_inspections          SET signature_data = NULL;  -- column name TBD per actual schema
--
-- Apply only after confirming column names against the latest schema.

COMMIT;
