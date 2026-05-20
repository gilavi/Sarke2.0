-- უსაფრთხოების ბადის შემოწმების აქტი (Safety Net Inspection)
-- Template UUID: 88888888-8888-8888-8888-888888888888
-- Photo path convention: safety-net/{inspection_id}/{item_id}/{uuid}.jpg

create table safety_net_inspections (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  template_id         uuid references templates(id) on delete set null,
  user_id             uuid not null references auth.users(id) on delete cascade,
  status              text not null default 'draft' check (status in ('draft', 'completed')),
  -- general info
  company             text,
  address             text,
  inspector_name      text,
  inspection_date     date not null default current_date,
  -- net identification
  manufacturer        text,
  net_size            text,
  post_size           text,
  post_count          int,
  post_anchor_count   int,
  anchor_point_count  int,
  edge_rope_count     int,
  cell_side           text,
  working_distance    text,
  certificate         text check (certificate in ('none', 'active', 'expired')),
  -- checklist items (10 visual, 5 post-test)
  items               jsonb not null default '[]'::jsonb,
  post_test_items     jsonb not null default '[]'::jsonb,
  -- load test rows [{id, name, unitWeightKg, quantity, totalWeightKg, comment}]
  load_test_rows      jsonb not null default '[]'::jsonb,
  -- verdict
  verdict             text check (verdict in ('pass', 'fail')),
  verdict_comment     text,
  -- signatures, qual doc, summary photos
  signatures          jsonb not null default '[{},{}]'::jsonb,
  qual_doc_path       text,
  summary_photos      jsonb not null default '[]'::jsonb,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index safety_net_inspections_project_id_idx
  on safety_net_inspections (project_id, created_at desc);

alter table safety_net_inspections enable row level security;

create policy "users can manage own safety_net_inspections"
  on safety_net_inspections for all
  using (auth.uid() = user_id);

create function set_safety_net_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_safety_net_updated_at
  before update on safety_net_inspections
  for each row execute function set_safety_net_updated_at();

-- System template row
insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  '88888888-8888-8888-8888-888888888888',
  null,
  'უსაფრთხოების ბადე',
  'safety_net_inspection',
  true,
  array[]::text[],
  array['expert', 'other']::signer_role[]
)
on conflict (id) do nothing;
