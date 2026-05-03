-- Excavator technical inspection — ექსკავატორის ტექნიკური შემოწმების აქტი
--
-- Separate table from bobcat_inspections: different schema, mixed checklist
-- format (3-state + yes/no/date), and extended inspector block.
--
-- Photo path convention in the `answer-photos` bucket:
--   excavator/{inspection_id}/{section}/{item_id}/{uuid}.jpg
--
-- Machine specs are stored as JSONB on the row (snapshot from the template
-- at creation time) so historical records stay accurate if specs change.

create table excavator_inspections (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references projects(id) on delete cascade,
  template_id          uuid references templates(id) on delete set null,
  user_id              uuid not null references auth.users(id) on delete cascade,
  status               text not null default 'draft'
                         check (status in ('draft', 'completed')),

  -- Machine specs snapshot (from EXCAVATOR_MACHINE_SPECS at creation)
  machine_specs        jsonb not null default '{}'::jsonb,

  -- Section II: document info
  serial_number        text,
  inventory_number     text,
  project_name         text,   -- ობიექტი / პროექტი
  department           text,
  inspection_date      date not null default current_date,
  moto_hours           numeric,
  inspector_name       text,
  last_inspection_date date,

  -- Section III: 3-state checklist items per section (JSONB arrays)
  -- Each element: {id, result: 'good'|'deficient'|'unusable'|null, comment, photo_paths}
  engine_items         jsonb not null default '[]'::jsonb,
  undercarriage_items  jsonb not null default '[]'::jsonb,
  cabin_items          jsonb not null default '[]'::jsonb,
  safety_items         jsonb not null default '[]'::jsonb,

  -- Section VI: maintenance items (yes/no/date)
  -- Each element: {id, answer: 'yes'|'no'|null, date: 'YYYY-MM-DD'|null}
  maintenance_items    jsonb not null default '[]'::jsonb,

  -- Section IV: verdict
  verdict              text check (verdict in ('approved', 'conditional', 'rejected')),
  notes                text,

  -- Section V: inspector
  inspector_position   text,
  inspector_signature  text,   -- base64 PNG without data: prefix

  completed_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index excavator_inspections_project_idx
  on excavator_inspections (project_id, created_at desc);

alter table excavator_inspections enable row level security;

create policy "excavator_inspections owner all" on excavator_inspections
  for all
  to authenticated
  using   (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function set_excavator_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger excavator_inspections_updated_at
  before update on excavator_inspections
  for each row execute procedure set_excavator_updated_at();

-- ── System template row ───────────────────────────────────────────────────────

insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  '55555555-5555-5555-5555-555555555555',
  null,
  'ექსკავატორის ტექნიკური შემოწმების აქტი',
  'excavator',
  true,
  array[]::text[],
  array['expert']::signer_role[]
)
on conflict (id) do nothing;
