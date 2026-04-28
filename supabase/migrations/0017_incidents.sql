-- Workplace incident reports (სამუშაო სივრცის ინციდენტები).
-- Captures all five Georgian labour-law incident types and produces
-- the official shrome-inspekciis notification protocol (ოქმი).
--
-- Path convention in the incident-photos bucket:
--   {incident_id}/{file_id}.jpg
--
-- NOTE: the `incident-photos` storage bucket is created here.
--   Create it in the Supabase dashboard if not running migrations locally.

create table incidents (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            text not null
                    check (type in ('minor','severe','fatal','mass','nearmiss')),
  injured_name    text,
  injured_role    text,
  date_time       timestamptz not null default now(),
  location        text not null default '',
  description     text not null default '',
  cause           text not null default '',
  actions_taken   text not null default '',
  witnesses       text[] not null default '{}',
  photos          text[] not null default '{}',
  inspector_signature text,
  status          text not null default 'draft'
                    check (status in ('draft','completed')),
  pdf_url         text,
  created_at      timestamptz not null default now()
);

create index incidents_project_id_idx
  on incidents (project_id, created_at desc);

alter table incidents enable row level security;

create policy "incidents owner all" on incidents
  for all
  to authenticated
  using   (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Incident-photos storage bucket ───────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload/read/delete photos they own.
-- We gate by auth.uid() != null rather than joining to incidents because
-- photos may be uploaded before the incident row is created (optimistic flow).

create policy "incident-photos insert" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'incident-photos' and auth.uid() is not null);

create policy "incident-photos select" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'incident-photos' and auth.uid() is not null);

create policy "incident-photos delete" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'incident-photos' and auth.uid() is not null);
