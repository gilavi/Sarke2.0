-- Project file attachments — arbitrary documents/photos uploaded against
-- a project (drawings, contracts, reports, etc.). Distinct from inspection
-- answer photos and certificates, which already have their own buckets.
--
-- Path convention in the storage bucket:
--   {project_id}/{file_id}-{sanitized_name}
-- so storage policies can authorise via the project_id prefix without
-- joining metadata.

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  storage_path text not null,
  size_bytes bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists project_files_project_id_idx
  on project_files (project_id, created_at desc);

alter table project_files enable row level security;

create policy "project_files owner read" on project_files
  for select
  to authenticated
  using (
    exists (
      select 1 from projects p
       where p.id = project_files.project_id
         and p.user_id = auth.uid()
    )
  );

create policy "project_files owner insert" on project_files
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from projects p
       where p.id = project_files.project_id
         and p.user_id = auth.uid()
    )
  );

create policy "project_files owner delete" on project_files
  for delete
  to authenticated
  using (
    exists (
      select 1 from projects p
       where p.id = project_files.project_id
         and p.user_id = auth.uid()
    )
  );

-- ---------- storage bucket + policies ----------

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- Authenticated CRUD gated by project ownership. The first path segment
-- is the project_id (uuid); we look it up against `projects.user_id`.

create policy "project-files owner read" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-files'
    and exists (
      select 1 from projects p
       where p.id::text = split_part(name, '/', 1)
         and p.user_id = auth.uid()
    )
  );

create policy "project-files owner insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-files'
    and exists (
      select 1 from projects p
       where p.id::text = split_part(name, '/', 1)
         and p.user_id = auth.uid()
    )
  );

create policy "project-files owner delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-files'
    and exists (
      select 1 from projects p
       where p.id::text = split_part(name, '/', 1)
         and p.user_id = auth.uid()
    )
  );
