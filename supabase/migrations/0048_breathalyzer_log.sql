-- 0048 breathalyzer_logs
-- Stores per-shift breathalyzer test logs (one log per project per date).
-- entries: JSONB array of BLEntry objects (ordered test results).
-- responsible_person: JSONB { name, signature } — set on shift close.

create table public.breathalyzer_logs (
  id                   uuid        not null default gen_random_uuid() primary key,
  project_id           uuid        not null references public.projects(id) on delete cascade,
  user_id              uuid        not null references auth.users(id),
  date                 date        not null,
  device_serial_number text,
  entries              jsonb       not null default '[]'::jsonb,
  responsible_person   jsonb       not null default '{"name":"","signature":null}'::jsonb,
  status               text        not null default 'open'
                                   check (status in ('open', 'closed')),
  pdf_uri              text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.breathalyzer_logs enable row level security;

create policy "Users manage own breathalyzer logs"
  on public.breathalyzer_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index breathalyzer_logs_project_date_idx
  on public.breathalyzer_logs (project_id, date desc);
