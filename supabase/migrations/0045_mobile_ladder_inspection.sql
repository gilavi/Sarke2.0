-- მობილური კიბის შემოწმების აქტი (Mobile Ladder Inspection)
-- Template UUID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- Photo path convention: mobile-ladder/{inspection_id}/{item_id}/{uuid}.jpg
-- Standard: EN 131-1:2015+A1:2019, EN 131-2:2010+A2:2017, EN 131-3:2018

create table mobile_ladder_inspections (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects(id) on delete cascade,
  template_id           uuid references templates(id) on delete set null,
  user_id               uuid not null references auth.users(id) on delete cascade,
  status                text not null default 'draft' check (status in ('draft', 'completed')),

  -- general info
  company               text,
  address               text,
  inspector_name        text,
  inspection_date       date not null default current_date,

  -- ladder identification (null means value not determinable)
  ladder_type           text,
  ladder_type_unknown   boolean not null default false,
  model                 text,
  model_unknown         boolean not null default false,
  height_m              numeric,
  height_unknown        boolean not null default false,
  max_load_kg           numeric,
  max_load_unknown      boolean not null default false,
  next_inspection_date  date,

  -- checklist (8 items: 5 structural + 3 mobile system)
  items                 jsonb not null default '[]'::jsonb,

  -- verdict
  verdict               text check (verdict in ('safe', 'minor', 'banned')),
  verdict_comment       text,

  -- single signatory
  signature             jsonb not null default '{}'::jsonb,

  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index mobile_ladder_inspections_project_id_idx
  on mobile_ladder_inspections (project_id, created_at desc);

alter table mobile_ladder_inspections enable row level security;
create policy "users can manage own mobile_ladder_inspections"
  on mobile_ladder_inspections for all
  using (auth.uid() = user_id);

create function set_mobile_ladder_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_mobile_ladder_updated_at
  before update on mobile_ladder_inspections
  for each row execute function set_mobile_ladder_updated_at();

-- System template row (appears after mobile scaffold entries in the selector)
insert into templates (
  id, owner_id, name, category, is_system,
  required_qualifications, required_signer_roles
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  null,
  'მობილური კიბე',
  'mobile_ladder_inspection',
  true,
  array[]::text[],
  array[]::signer_role[]
)
on conflict (id) do nothing;
