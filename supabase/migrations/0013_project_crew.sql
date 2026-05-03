-- Add a crew (მონაწილეები) array to projects. Each row represents a
-- person involved on the project — name + freeform role + optional
-- signature path. Stored as JSONB on the project row (rather than its own
-- table) because:
--   * the list is short and read-mostly together with the project,
--   * roles are freeform user text (no FK / enum to enforce),
--   * the same array is mutated from two surfaces (project screen + the
--     inspection signing flow) and a single column avoids a write fan-out.
--
-- The "inspector" is NOT stored here — it's derived from auth at render
-- time (the logged-in expert's name). Only manually-added members live in
-- the array.
--
-- Element shape (mirrors types/models.ts CrewMember):
--   { "id": uuid, "name": text, "role": text, "signature": text | null }

alter table projects
  add column if not exists crew jsonb;
-- Treat NULL as "legacy / not yet edited" so migrations don't have to
-- backfill. The app reads `crew ?? []`. We still validate the shape when
-- the column is present so a malformed write fails loudly.
alter table projects
  add constraint projects_crew_is_array
    check (crew is null or jsonb_typeof(crew) = 'array');
