-- Feature additions: inspection checklist items + recurring schedules,
-- project metadata fields, and questionnaire→item linkage.
-- Note: user terms-acceptance columns already exist as tc_accepted_at /
-- tc_accepted_version (see 0002_terms_acceptance.sql), so they are not
-- re-added here.

-- ---------- projects: new metadata ----------

alter table projects
  add column if not exists project_number bigserial,
  add column if not exists company_id_number text,
  add column if not exists company_contact_name text,
  add column if not exists company_contact_phone text;
-- ---------- project_items ----------

create table if not exists project_items (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz not null default now()
);
create index if not exists idx_project_items_project on project_items(project_id);
-- ---------- schedules (10-day recurring inspection) ----------

create table if not exists schedules (
  id uuid primary key default uuid_generate_v4(),
  project_item_id uuid not null references project_items(id) on delete cascade,
  last_inspected_at timestamptz,
  next_due_at timestamptz,
  interval_days int not null default 10,
  created_at timestamptz not null default now()
);
create index if not exists idx_schedules_item on schedules(project_item_id);
create index if not exists idx_schedules_due on schedules(next_due_at);
-- ---------- questionnaires: link to project_item ----------

alter table questionnaires
  add column if not exists project_item_id uuid references project_items(id) on delete set null;
create index if not exists idx_quest_project_item on questionnaires(project_item_id);
-- ===========================================================================
-- Row Level Security
-- ===========================================================================

alter table project_items enable row level security;
alter table schedules enable row level security;
-- project_items: accessible if parent project owner
create policy "project_items via project" on project_items
  for all using (exists (
    select 1 from projects p where p.id = project_id and p.user_id = auth.uid()
  )) with check (exists (
    select 1 from projects p where p.id = project_id and p.user_id = auth.uid()
  ));
-- schedules: accessible if parent project owner
create policy "schedules via project" on schedules
  for all using (exists (
    select 1 from project_items pi
    join projects p on p.id = pi.project_id
    where pi.id = project_item_id and p.user_id = auth.uid()
  )) with check (exists (
    select 1 from project_items pi
    join projects p on p.id = pi.project_id
    where pi.id = project_item_id and p.user_id = auth.uid()
  ));
