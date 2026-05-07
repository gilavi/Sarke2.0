-- Add summary_photos column to bobcat and excavator inspection tables.
-- general_equipment_inspections already has this column (added in 0027).

ALTER TABLE bobcat_inspections
  ADD COLUMN summary_photos jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE excavator_inspections
  ADD COLUMN summary_photos jsonb NOT NULL DEFAULT '[]'::jsonb;
