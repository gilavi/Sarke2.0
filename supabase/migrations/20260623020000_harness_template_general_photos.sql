-- Add a "general photos" (photo_upload) question to the harness template so the
-- inspection wizard's conclusion step shows the photo-upload section, matching
-- every other system template (scaffold etc.).
--
-- Background: the harness template (22222222-…, category 'harness') was seeded
-- with only a component_grid (Section 1) + a freetext conclusion (Section 3).
-- It had NO photo_upload question, so features/inspection-wizard/useWizardState
-- resolved photoQuestion === null and ConclusionStep never rendered the
-- "საერთო ფოტოები" upload. Other templates put photo_upload in Section 3
-- (folded into the conclusion as photos) and the freetext in Section 4 (folded
-- into the conclusion textarea, skipped as a standalone step). This migration
-- aligns the harness template to that structure.
--
-- Idempotent: safe to re-run.
--
-- Apply via:
--   supabase db query --linked --file supabase/migrations/20260623020000_harness_template_general_photos.sql

-- 1) Move the existing freetext conclusion from Section 3 → Section 4 so the
--    wizard folds it into the conclusion textarea instead of rendering a
--    duplicate standalone freetext step.
UPDATE questions
  SET section = 4
WHERE template_id = '22222222-2222-2222-2222-222222222222'
  AND type = 'freetext'
  AND section = 3;

-- 2) Add the general-photos question in Section 3 (only if absent).
INSERT INTO questions (template_id, section, "order", type, title)
SELECT '22222222-2222-2222-2222-222222222222', 3, 1,
       'photo_upload'::question_type, 'ქამრების საერთო ფოტოები'
WHERE NOT EXISTS (
  SELECT 1 FROM questions
  WHERE template_id = '22222222-2222-2222-2222-222222222222'
    AND type = 'photo_upload'
);
