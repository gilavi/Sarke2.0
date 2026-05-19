-- დამჭერი მოწყობილობების შემოწმების აქტი (Fall Protection Equipment Inspection)
-- Template UUID: cccccccc-cccc-cccc-cccc-cccccccccccc
-- Photo path convention: fall-protection/{inspection_id}/device-{device_idx}/{uuid}.jpg
-- Standards: EN 363:2008 · EN 795:2012 · EN 354:2010 · EN 355:2002 · EN 1891:2020 · EN 361:2002

create table fall_protection_inspections (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects(id) on delete cascade,
  template_id           uuid references templates(id) on delete set null,
  user_id               uuid not null references auth.users(id) on delete cascade,
  status                text not null default 'draft' check (status in ('draft', 'completed')),

  -- general info
  company               text,
  address               text,
  inspection_date       date not null default current_date,
  safety_leader_name    text,
  safety_leader_phone   text,
  inspection_type       text check (inspection_type in ('primary', 'secondary')),
  next_inspection_date  date,

  -- equipment registry: array of {id, type, location, floor, purpose, comment}
  devices               jsonb not null default '[]'::jsonb,

  -- per-device inspection data: array of {deviceId, items, customItem, verdict,
  -- verdictComment, signature, photoPaths}
  device_data           jsonb not null default '[]'::jsonb,

  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index fall_protection_inspections_project_id_idx
  on fall_protection_inspections (project_id, created_at desc);

alter table fall_protection_inspections enable row level security;
create policy "users can manage own fall_protection_inspections"
  on fall_protection_inspections for all
  using (auth.uid() = user_id);

create function set_fall_protection_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_fall_protection_updated_at
  before update on fall_protection_inspections
  for each row execute function set_fall_protection_updated_at();

-- System template row
insert into templates (
  id, owner_id, name, category, is_system,
  required_qualifications, required_signer_roles
)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  null,
  'დამჭერი მოწყობილობა',
  'fall_protection_inspection',
  true,
  array[]::text[],
  array[]::signer_role[]
)
on conflict (id) do nothing;
