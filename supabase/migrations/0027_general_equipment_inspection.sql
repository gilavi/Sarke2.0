-- General equipment inspection — ტექნიკური აღჭურვილობის შემოწმების აქტი
--
-- Flexible / custom template: user builds their own equipment list.
-- No predefined checklist items — all equipment rows are user-authored.
--
-- Photo path convention in the `answer-photos` bucket:
--   general_equipment/{inspection_id}/equipment/{row_id}/{uuid}.jpg
--   general_equipment/{inspection_id}/summary/summary/{uuid}.jpg

create table general_equipment_inspections (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references projects(id) on delete cascade,
  template_id          uuid references templates(id) on delete set null,
  user_id              uuid not null references auth.users(id) on delete cascade,
  status               text not null default 'draft'
                         check (status in ('draft', 'completed')),

  -- Section I: general info
  object_name          text,
  address              text,
  activity_type        text,
  inspection_date      date not null default current_date,
  act_number           text,
  inspection_type      text check (inspection_type in ('initial', 'repeat', 'scheduled')),
  inspector_name       text,

  -- Section II: equipment list (JSONB array)
  -- Each element: { id, name, model, serialNumber,
  --                 condition: 'good'|'needs_service'|'unusable'|null,
  --                 note, photo_paths }
  equipment            jsonb not null default '[]'::jsonb,

  -- Section III: summary
  conclusion           text,
  summary_photos       jsonb not null default '[]'::jsonb,

  -- Section IV: signature
  signer_name          text,
  signer_role          text check (signer_role in ('electrician', 'technician', 'safety_specialist', 'other')),
  signer_role_custom   text,
  inspector_signature  text,   -- base64 PNG without data: prefix

  completed_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index general_equipment_inspections_project_idx
  on general_equipment_inspections (project_id, created_at desc);

alter table general_equipment_inspections enable row level security;

create policy "general_equipment_inspections owner all" on general_equipment_inspections
  for all
  to authenticated
  using   (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function set_general_equipment_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger general_equipment_inspections_updated_at
  before update on general_equipment_inspections
  for each row execute procedure set_general_equipment_updated_at();

-- ── System template row ───────────────────────────────────────────────────────

insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  '66666666-6666-6666-6666-666666666666',
  null,
  'ტექნიკური აღჭურვილობის შემოწმების აქტი',
  'general_equipment',
  true,
  array[]::text[],
  array['expert']::signer_role[]
)
on conflict (id) do nothing;
