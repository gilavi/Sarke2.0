-- ტვირთის მიმღები პლატფორმის შემოწმების აქტი
-- (Cargo Receiving Platform — Technical Inspection & Safety Acceptance Act)
--
-- Self-contained table: stores all 7 sections (general info, platform ID,
-- cargo list, 9-item checklist, verdict, summary photos, two signatories)
-- in a single row using JSONB for variable-length arrays.
--
-- Two signatories (both must sign to complete) stored in `signatures` JSONB.
-- Checklist result set: 'good' | 'fix' | 'na'  (not the usual good/deficient/unusable)
-- Fix rows are amber in the PDF (fixable, not rejected).
--
-- Photo path convention in the `answer-photos` bucket:
--   cargo-platform/{inspection_id}/{item_id}/{uuid}.jpg
--   cargo-platform/{inspection_id}/summary/{uuid}.jpg
--
-- System template UUID: 77777777-7777-7777-7777-777777777777

create table cargo_platform_inspections (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects(id) on delete cascade,
  template_id           uuid references templates(id) on delete set null,
  user_id               uuid not null references auth.users(id) on delete cascade,
  status                text not null default 'draft'
                          check (status in ('draft', 'completed')),

  -- Section 1: ზოგადი ინფორმაცია
  company               text,
  address               text,
  inspector_name        text,
  floor_zone            text,
  inspection_date       date not null default current_date,

  -- Section 2: პლატფორმის იდენტიფიკაცია
  platform_type_model   text,
  platform_length_m     numeric,
  platform_width_m      numeric,
  platform_color_desc   text,
  side_guardrail        text check (side_guardrail in ('none', 'complete')),
  front_guardrail       text check (front_guardrail in ('none', 'complete')),
  guardrail_height      text check (guardrail_height in ('non_standard', 'standard')),

  -- Section 3: cargo rows [{id, name, unit_weight_kg, total_weight_kg, note}]
  cargo                 jsonb not null default '[]'::jsonb,

  -- Section 4: checklist [{id, result, comment, photo_paths}]
  -- result: 'good' | 'fix' | 'na' | null
  items                 jsonb not null default '[]'::jsonb,

  -- Section 5: verdict
  verdict               text check (verdict in ('approved', 'conditional', 'rejected')),
  verdict_comment       text,

  -- Section 6: summary photos (storage paths)
  summary_photos        jsonb not null default '[]'::jsonb,

  -- Section 7: two signatories [{name, position, organization, signature, date}, ...]
  signatures            jsonb not null default '[{},{}]'::jsonb,

  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index cargo_platform_inspections_project_id_idx
  on cargo_platform_inspections (project_id, created_at desc);

alter table cargo_platform_inspections enable row level security;

create policy "cargo_platform_inspections owner all" on cargo_platform_inspections
  for all
  to authenticated
  using   (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function set_cargo_platform_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cargo_platform_inspections_updated_at
  before update on cargo_platform_inspections
  for each row execute procedure set_cargo_platform_updated_at();

-- ── System template ───────────────────────────────────────────────────────────
-- Fixed UUID so the app can detect category='cargo_platform' and route to
-- the dedicated screen. Scheduling: 10-day cycle (handled in calendarSchedule.ts).

insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  '77777777-7777-7777-7777-777777777777',
  null,
  'ტვირთის მიმღები პლატფორმის შემოწმების აქტი',
  'cargo_platform',
  true,
  array[]::text[],
  array['expert']::signer_role[]
)
on conflict (id) do nothing;
