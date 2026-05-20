-- ტვირთის გადასატანი თასმების / ჩამჭიდების შემოწმების აქტი
-- (Lifting Accessories Inspection)
-- Template UUID: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
-- Photo path convention: lifting-accessories/{inspection_id}/{item_id}/{uuid}.jpg

create table lifting_accessories_inspections (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects(id) on delete cascade,
  template_id           uuid references templates(id) on delete set null,
  user_id               uuid not null references auth.users(id) on delete cascade,
  status                text not null default 'draft' check (status in ('draft','completed')),
  -- general info
  company               text,
  address               text,
  inspector_name        text,
  inspection_date       date not null default current_date,
  -- equipment identification
  equipment_types       jsonb not null default '[]'::jsonb,
  equipment_type_other  text not null default '',
  serial_number         text not null default '',
  manufacturer          text not null default '',
  year_of_manufacture   text not null default '',
  marking_status        text check (marking_status in ('სრული','ნაწილობრივი','არ გააჩნია')),
  wll_kg                text not null default '',
  unit_count            text not null default '',
  next_inspection_date  date,
  -- checklist items [{id, result, comment, photo_paths}]
  items                 jsonb not null default '[]'::jsonb,
  -- removed from service [{id, serialNumber, typeDescription, reason}]
  removed_rows          jsonb not null default '[]'::jsonb,
  -- verdict
  verdict               text check (verdict in ('pass','repair','fail')),
  verdict_comment       text not null default '',
  -- signatures [{name, position, organization, extra, signature, date}]
  signatures            jsonb not null default '[{},{}]'::jsonb,
  summary_photos        jsonb not null default '[]'::jsonb,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index lifting_accessories_inspections_project_id_idx
  on lifting_accessories_inspections (project_id, created_at desc);

alter table lifting_accessories_inspections enable row level security;
create policy "users can manage own lifting_accessories_inspections"
  on lifting_accessories_inspections for all
  using (auth.uid() = user_id);

-- updated_at trigger
create function set_lifting_accessories_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_lifting_accessories_updated_at
  before update on lifting_accessories_inspections
  for each row execute function set_lifting_accessories_updated_at();

-- System template row
insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null,
  'ამწე მოწყ. / სლინგი / ჩამჭ.', 'lifting_accessories_inspection', true,
  array[]::text[], array['expert','other']::signer_role[])
on conflict (id) do nothing;
