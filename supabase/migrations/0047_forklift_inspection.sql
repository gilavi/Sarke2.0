-- ჩანგლიანი დამტვირთველის შემოწმების აქტი (Forklift Inspection)
-- Template UUID: dddddddd-dddd-dddd-dddd-dddddddddddd
-- Photo path convention: forklift/{inspection_id}/{item_id}/{uuid}.jpg
--                        forklift/{inspection_id}/summary/{uuid}.jpg
--                        forklift/{inspection_id}/qual-doc/{uuid}.jpg
--
-- 39-item checklist across 3 sections:
--   A (1-8):  სამაგრი სვეტი / ჰიდრავლიკა
--   B (9-20): ჩანგლები / ეტლი / თვლები / მუხრუჭი
--   C (21-39):კაბინა / საჭე / უსაფრთხოება
--
-- Extended signature block: signer_name, signer_position, signer_phone,
-- signer_signature (base64 PNG blob).
-- Scheduling: 10-day cycle.

create table forklift_inspections (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  template_id         uuid references templates(id) on delete set null,
  user_id             uuid not null references auth.users(id) on delete cascade,
  status              text not null default 'draft'
                        check (status in ('draft', 'completed')),

  -- Section I: identification
  company             text,
  address             text,
  inventory_number    text,
  brand_model         text,
  engine_type         text check (engine_type in ('electric', 'gasoline', 'diesel', 'gas')),
  inspection_date     date not null default current_date,
  inspector_name      text,

  -- Section III: checklist [{id, result, comment, photo_paths}]
  -- result: 'good' | 'deficient' | 'unusable' | null
  items               jsonb not null default '[]'::jsonb,

  -- Section IV: verdict
  verdict             text check (verdict in ('approved', 'limited', 'rejected')),
  notes               text,
  summary_photos      jsonb not null default '[]'::jsonb,
  qual_doc_path       text,

  -- Section V: extended signature
  signer_name         text,
  signer_position     text,
  signer_phone        text,
  signer_signature    text,   -- base64 PNG

  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index forklift_inspections_project_id_idx
  on forklift_inspections (project_id, created_at desc);

alter table forklift_inspections enable row level security;

create policy "forklift_inspections owner all" on forklift_inspections
  for all
  to authenticated
  using   (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function set_forklift_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger forklift_inspections_updated_at
  before update on forklift_inspections
  for each row execute procedure set_forklift_updated_at();

-- ── System template ───────────────────────────────────────────────────────────
-- Fixed UUID so the app can detect category='forklift_inspection' and route to
-- the dedicated screen. Scheduling: 10-day cycle.

insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  null,
  'ჩანგლიანი დამტვირთველი',
  'forklift_inspection',
  true,
  array[]::text[],
  array['expert']::signer_role[]
)
on conflict (id) do nothing;
