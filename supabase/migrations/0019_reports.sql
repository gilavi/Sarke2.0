-- Reports (რეპორტები) — slide-based visual safety reports.
--
-- Each report belongs to a project and contains an ordered array of slides.
-- A slide has a title, optional description, and optionally one image
-- (raw or annotated). Slides live inline as a JSONB array because:
--   - The whole report is loaded/edited as a unit.
--   - Drag-to-reorder is a single UPDATE.
--   - There's no per-slide history requirement.
--
-- Slides JSONB shape:
--   [{
--      id: text,
--      order: int,
--      title: text,
--      description: text,
--      image_path: text|null,           -- storage path in report-photos bucket
--      annotated_image_path: text|null  -- annotated variant; PDF prefers this
--    }, ...]
--
-- RLS: owner = user who owns the parent project.

create table if not exists reports (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references projects(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  title        text        not null,
  status       text        not null default 'draft',
  slides       jsonb       not null default '[]',
  pdf_url      text,
  created_at   timestamptz not null default now(),

  constraint reports_status_check check (status in ('draft', 'completed'))
);

create index if not exists reports_project_id_idx
  on reports (project_id, created_at desc);

create index if not exists reports_user_id_idx
  on reports (user_id);

alter table reports enable row level security;

-- ── RLS policies — owner = user who owns the parent project ──────────────────

create policy "reports owner select" on reports
  for select to authenticated
  using (
    exists (
      select 1 from projects p
       where p.id = reports.project_id
         and p.user_id = auth.uid()
    )
  );

create policy "reports owner insert" on reports
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from projects p
       where p.id = reports.project_id
         and p.user_id = auth.uid()
    )
  );

create policy "reports owner update" on reports
  for update to authenticated
  using (
    exists (
      select 1 from projects p
       where p.id = reports.project_id
         and p.user_id = auth.uid()
    )
  );

create policy "reports owner delete" on reports
  for delete to authenticated
  using (
    exists (
      select 1 from projects p
       where p.id = reports.project_id
         and p.user_id = auth.uid()
    )
  );

-- ── Storage bucket for report slide photos ──────────────────────────────────

insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', false)
on conflict (id) do nothing;

create policy "report-photos insert" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'report-photos' and auth.uid() is not null);

create policy "report-photos select" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'report-photos' and auth.uid() is not null);

create policy "report-photos delete" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'report-photos' and auth.uid() is not null);
