-- Add safety_verdict column to questionnaires for 3-state verdict support.
--
-- Rationale: is_safe_for_use boolean cannot express "allowed with caution"
-- (comment #11 on ClickUp task "ფასადის ხარაჩოს შემოწმების აქტი").
-- The new column drives the UI and PDF; is_safe_for_use is kept for backward
-- compatibility and set to (verdict = 'safe').
--
-- Apply via:
--   supabase db query --linked --file supabase/migrations/20260527150000_safety_verdict.sql

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS safety_verdict text
    CHECK (safety_verdict IN ('safe', 'caution', 'unsafe'));

-- Backfill existing rows: true→safe, false→unsafe, null stays null.
UPDATE inspections
  SET safety_verdict = CASE
    WHEN is_safe_for_use = true  THEN 'safe'
    WHEN is_safe_for_use = false THEN 'unsafe'
    ELSE NULL
  END
WHERE safety_verdict IS NULL;
