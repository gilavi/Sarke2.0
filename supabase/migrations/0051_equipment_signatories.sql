-- Add signatories JSONB column to all equipment inspection tables.
-- Mirrors the same column added to inspections in 0050_inspections_add_signatories.sql.
-- Each entry: { name, role, signature (full data URL), signed_at (ISO 8601) }

ALTER TABLE bobcat_inspections
  ADD COLUMN IF NOT EXISTS signatories jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE excavator_inspections
  ADD COLUMN IF NOT EXISTS signatories jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE cargo_platform_inspections
  ADD COLUMN IF NOT EXISTS signatories jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE general_equipment_inspections
  ADD COLUMN IF NOT EXISTS signatories jsonb NOT NULL DEFAULT '[]'::jsonb;
