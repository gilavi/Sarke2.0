-- Safety briefing (ინსტრუქტაჟი) records.
--
-- Each briefing captures a safety briefing event on a project: the date/time,
-- covered topics, each worker's captured signature, and the inspector's final
-- countersignature.
--
-- Columns:
--   participants  JSONB array [{name: text, signature: text|null}]
--                 where signature is a base64-encoded PNG (no "data:" prefix).
--   topics        text[] — predefined keys ('scaffold_safety', 'height_work',
--                 'ppe', 'evacuation', 'fire_safety') plus 'custom:<label>'
--                 for freeform entries.
--   inspector_signature  base64 PNG (same convention as participants.signature).
--   status        'draft' while signing is in progress; 'completed' once the
--                 inspector has signed.
--
-- RLS: a row is visible/mutable only to the user who owns the parent project.

create table if not exists briefings (
  id                   uuid        primary key default gen_random_uuid(),
  project_id           uuid        not null references projects(id) on delete cascade,
  user_id              uuid        not null references auth.users(id) on delete cascade,
  date_time            timestamptz not null,
  topics               text[]      not null default '{}',
  participants         jsonb       not null default '[]',
  inspector_signature  text,
  inspector_name       text        not null default '',
  status               text        not null default 'draft',
  created_at           timestamptz not null default now(),

  constraint briefings_status_check check (status in ('draft', 'completed'))
);

create index if not exists briefings_project_id_idx
  on briefings (project_id, created_at desc);

create index if not exists briefings_user_id_idx
  on briefings (user_id);

alter table briefings enable row level security;

-- ── RLS policies — owner = user who owns the parent project ──────────────────

create policy "briefings owner select" on briefings
  for select to authenticated
  using (
    exists (
      select 1 from projects p
       where p.id = briefings.project_id
         and p.user_id = auth.uid()
    )
  );

create policy "briefings owner insert" on briefings
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from projects p
       where p.id = briefings.project_id
         and p.user_id = auth.uid()
    )
  );

create policy "briefings owner update" on briefings
  for update to authenticated
  using (
    exists (
      select 1 from projects p
       where p.id = briefings.project_id
         and p.user_id = auth.uid()
    )
  );

create policy "briefings owner delete" on briefings
  for delete to authenticated
  using (
    exists (
      select 1 from projects p
       where p.id = briefings.project_id
         and p.user_id = auth.uid()
    )
  );
