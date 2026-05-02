-- inspection_attachments — equipment certificates uploaded per inspection.
--
-- Distinct from `qualifications` (the expert's professional credentials)
-- and from `certificates` (generated PDFs). One inspection : many
-- equipment certs. Each cert has a type chip (predefined or "სხვა"),
-- an optional ID number, and an optional 16:9 photo of the cert.
--
-- Photos live in the existing `certificates` storage bucket (already
-- configured for cert-like imagery in 0001_init.sql).

create table inspection_attachments (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid not null references inspections(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  cert_type text not null,
  cert_number text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_inspection_attachments_inspection
  on inspection_attachments(inspection_id);
create index idx_inspection_attachments_user
  on inspection_attachments(user_id);

alter table inspection_attachments enable row level security;

create policy "inspection_attachments owner" on inspection_attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reuse the shared updated_at trigger added in 0020.
create trigger trg_inspection_attachments_updated_at
  before update on inspection_attachments
  for each row
  execute function set_updated_at();
