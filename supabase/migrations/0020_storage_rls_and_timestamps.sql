-- Tighten storage RLS for incident-photos and report-photos, and add
-- updated_at audit timestamps to user-data tables.
--
-- Background:
--   * Pre-existing policies on the `incident-photos` and `report-photos`
--     buckets gated only on `auth.uid() is not null`, meaning any
--     authenticated user could read or delete any other user's files.
--     This migration scopes SELECT and DELETE to the row owner via the
--     path's first segment ({incident_id}/... and {report_id}/...).
--   * INSERT remains permissive because incident photos are uploaded
--     optimistically before the incident row exists (see 0017_incidents.sql
--     and app/incidents/new.tsx — `incidentId` is client-generated). The
--     security exposure for INSERT is bounded: a malicious client would
--     need to guess unguessable UUIDs to clobber another user's path.
--
--   * No table previously had `updated_at`. We add it to the user-data
--     tables that mutate post-creation, plus a shared trigger to maintain
--     it on every UPDATE. Tables whose rows are append-only (answers,
--     answer_photos, signatures, certificates, schedules, project_items,
--     project_files, remote_signing_requests) are intentionally excluded.

-- ===========================================================================
-- Storage RLS — incident-photos
-- ===========================================================================

drop policy if exists "incident-photos select" on storage.objects;
drop policy if exists "incident-photos delete" on storage.objects;

create policy "incident-photos select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'incident-photos'
    and exists (
      select 1 from incidents i
       where i.id::text = split_part(name, '/', 1)
         and i.user_id = auth.uid()
    )
  );

create policy "incident-photos delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'incident-photos'
    and exists (
      select 1 from incidents i
       where i.id::text = split_part(name, '/', 1)
         and i.user_id = auth.uid()
    )
  );

-- INSERT policy from 0017 is intentionally retained. See header comment.

-- ===========================================================================
-- Storage RLS — report-photos
-- ===========================================================================
--
-- Reports always exist before any slide image is uploaded
-- (app/reports/[id]/slide/[slideId].tsx returns null without `report`),
-- so we can scope INSERT here too.

drop policy if exists "report-photos insert" on storage.objects;
drop policy if exists "report-photos select" on storage.objects;
drop policy if exists "report-photos delete" on storage.objects;

create policy "report-photos insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'report-photos'
    and exists (
      select 1 from reports r
       where r.id::text = split_part(name, '/', 1)
         and r.user_id = auth.uid()
    )
  );

create policy "report-photos select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'report-photos'
    and exists (
      select 1 from reports r
       where r.id::text = split_part(name, '/', 1)
         and r.user_id = auth.uid()
    )
  );

create policy "report-photos delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'report-photos'
    and exists (
      select 1 from reports r
       where r.id::text = split_part(name, '/', 1)
         and r.user_id = auth.uid()
    )
  );

-- ===========================================================================
-- Shared updated_at trigger
-- ===========================================================================

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ===========================================================================
-- Add updated_at to mutable user-data tables
-- ===========================================================================

alter table users          add column if not exists updated_at timestamptz not null default now();
alter table projects       add column if not exists updated_at timestamptz not null default now();
alter table inspections    add column if not exists updated_at timestamptz not null default now();
alter table incidents      add column if not exists updated_at timestamptz not null default now();
alter table briefings      add column if not exists updated_at timestamptz not null default now();
alter table reports        add column if not exists updated_at timestamptz not null default now();
alter table qualifications add column if not exists updated_at timestamptz not null default now();
alter table project_signers add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();

drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();

drop trigger if exists trg_inspections_updated_at on inspections;
create trigger trg_inspections_updated_at before update on inspections
  for each row execute function set_updated_at();

drop trigger if exists trg_incidents_updated_at on incidents;
create trigger trg_incidents_updated_at before update on incidents
  for each row execute function set_updated_at();

drop trigger if exists trg_briefings_updated_at on briefings;
create trigger trg_briefings_updated_at before update on briefings
  for each row execute function set_updated_at();

drop trigger if exists trg_reports_updated_at on reports;
create trigger trg_reports_updated_at before update on reports
  for each row execute function set_updated_at();

drop trigger if exists trg_qualifications_updated_at on qualifications;
create trigger trg_qualifications_updated_at before update on qualifications
  for each row execute function set_updated_at();

drop trigger if exists trg_project_signers_updated_at on project_signers;
create trigger trg_project_signers_updated_at before update on project_signers
  for each row execute function set_updated_at();

-- ===========================================================================
-- Helpful indexes flagged by audit
-- ===========================================================================

-- project_signers lookup by (project_id, role, full_name) used during
-- inspection signing flow (lib/services.real.ts).
create index if not exists project_signers_lookup_idx
  on project_signers (project_id, role, full_name);

-- certificates list view paginates by user + recency.
create index if not exists certificates_user_generated_idx
  on certificates (user_id, generated_at desc);
