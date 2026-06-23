-- Add a summary_photos column to mobile_ladder_inspections so the conclusion
-- step can carry general photos, consistent with the other equipment flows
-- (bobcat/excavator/cargo/safety-net/forklift/lifting-accessories already have
-- this column). Nullable-with-default so existing rows are unaffected.

ALTER TABLE mobile_ladder_inspections
  ADD COLUMN IF NOT EXISTS summary_photos jsonb NOT NULL DEFAULT '[]'::jsonb;
