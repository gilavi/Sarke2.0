-- 0023_photo_location.sql
-- Add GPS coordinates and reverse-geocoded address to answer_photos.
-- Replaces the temporary addr: prefix encoding in the caption field.

ALTER TABLE answer_photos
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS address   text;

-- Backfill: extract address from any existing addr:-prefixed captions
-- and clear the prefix so caption is either NULL or a plain row: key.
UPDATE answer_photos
SET
  address = substring(caption FROM 6),
  caption = NULL
WHERE caption LIKE 'addr:%';
