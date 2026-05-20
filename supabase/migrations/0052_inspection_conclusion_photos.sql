-- Add an array of storage paths for photos attached to the conclusion step.
-- Stored as text[] so no join is needed when loading the inspection record.
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS conclusion_photo_paths text[] NOT NULL DEFAULT '{}';
