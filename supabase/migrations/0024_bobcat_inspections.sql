-- Bobcat / Skid-Steer Loader inspection (ციცხვიანი დამტვირთველის შემოწმების აქტი).
-- Self-contained table: stores general info, 30-item checklist (JSONB), summary,
-- verdict, and inspector signature in a single row.
--
-- Photo path convention in the `answer-photos` bucket:
--   bobcat/{inspection_id}/{item_id}/{uuid}.jpg
--
-- The system template row is inserted with a fixed UUID so the app can
-- detect category='bobcat' and route to the dedicated screen.

create table bobcat_inspections (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  template_id         uuid references templates(id) on delete set null,
  user_id             uuid not null references auth.users(id) on delete cascade,
  status              text not null default 'draft'
                        check (status in ('draft', 'completed')),

  -- Section I: ზოგადი ინფორმაცია
  company             text,
  address             text,
  equipment_model     text,
  registration_number text,
  inspection_date     date not null default current_date,
  inspection_type     text
                        check (inspection_type in ('pre_work', 'scheduled', 'other')),
  inspector_name      text,

  -- Section III: checklist — array of {id, result, comment, photo_paths}
  -- result: 'good' | 'deficient' | 'unusable' | null
  items               jsonb not null default '[]'::jsonb,

  -- Section IV: summary
  verdict             text
                        check (verdict in ('approved', 'limited', 'rejected')),
  notes               text,

  -- Section V: inspector signature (base64 PNG without data: prefix)
  inspector_signature text,

  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index bobcat_inspections_project_id_idx
  on bobcat_inspections (project_id, created_at desc);

alter table bobcat_inspections enable row level security;

create policy "bobcat_inspections owner all" on bobcat_inspections
  for all
  to authenticated
  using   (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Trigger to keep updated_at current
create or replace function set_bobcat_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bobcat_inspections_updated_at
  before update on bobcat_inspections
  for each row execute procedure set_bobcat_updated_at();

-- ── System template ───────────────────────────────────────────────────────────
-- Fixed UUID so the app can look it up without a DB round-trip at startup.
-- Photos and checklist items are handled entirely in the app — no questions rows needed.

insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  '33333333-3333-3333-3333-333333333333',
  null,
  'ციცხვიანი დამტვირთველის შემოწმების აქტი',
  'bobcat',
  true,
  array[]::text[],
  array['expert']::signer_role[]
)
on conflict (id) do nothing;
