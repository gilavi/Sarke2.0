-- Sarke 2.0 initial schema
-- Postgres 15+ (Supabase). All user data is RLS-scoped.

create extension if not exists "uuid-ossp";
-- ---------- enums ----------

create type question_type as enum (
  'yesno',
  'measure',
  'component_grid',
  'freetext',
  'photo_upload'
);
create type questionnaire_status as enum ('draft', 'completed');
create type signer_role as enum (
  'expert',
  'xaracho_supervisor',
  'xaracho_assembler'
);
-- ---------- users ----------

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  created_at timestamptz not null default now()
);
-- ---------- certificates ----------

create table certificates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,                -- e.g. 'xaracho_inspector', 'harness_inspector'
  number text,
  issued_at date,
  expires_at date,
  file_url text,                     -- storage path in bucket 'certificates'
  created_at timestamptz not null default now()
);
create index idx_certificates_user on certificates(user_id);
-- ---------- projects ----------

create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  company_name text,
  address text,
  created_at timestamptz not null default now()
);
create index idx_projects_user on projects(user_id);
-- ---------- project_signers ----------

create table project_signers (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  role signer_role not null,
  full_name text not null,
  phone text,
  position text,
  signature_png_url text,            -- saved signature in bucket 'signatures'
  created_at timestamptz not null default now()
);
create index idx_signers_project on project_signers(project_id);
-- ---------- templates ----------

create table templates (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references users(id) on delete cascade,  -- null for system templates
  name text not null,
  category text,
  is_system boolean not null default false,
  required_cert_types text[] not null default '{}',
  required_signer_roles signer_role[] not null default '{}',
  created_at timestamptz not null default now()
);
-- ---------- questions ----------

create table questions (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references templates(id) on delete cascade,
  section int not null default 1,
  "order" int not null,
  type question_type not null,
  title text not null,
  min_val numeric,
  max_val numeric,
  unit text,
  grid_rows jsonb,                   -- array of row labels
  grid_cols jsonb                    -- array of column labels
);
create index idx_questions_template on questions(template_id, section, "order");
-- ---------- questionnaires ----------

create table questionnaires (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  template_id uuid not null references templates(id),
  user_id uuid not null references users(id) on delete cascade,
  status questionnaire_status not null default 'draft',
  harness_name text,                 -- template B specific
  conclusion_text text,
  is_safe_for_use boolean,
  pdf_url text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index idx_quest_project on questionnaires(project_id);
create index idx_quest_user on questionnaires(user_id);
-- ---------- answers ----------

create table answers (
  id uuid primary key default uuid_generate_v4(),
  questionnaire_id uuid not null references questionnaires(id) on delete cascade,
  question_id uuid not null references questions(id),
  value_bool boolean,
  value_num numeric,
  value_text text,
  grid_values jsonb,                 -- { "rowLabel": { "colLabel": value } }
  comment text,
  unique (questionnaire_id, question_id)
);
create index idx_answers_q on answers(questionnaire_id);
-- ---------- answer_photos ----------

create table answer_photos (
  id uuid primary key default uuid_generate_v4(),
  answer_id uuid not null references answers(id) on delete cascade,
  storage_path text not null,        -- bucket 'answer-photos'
  caption text,
  created_at timestamptz not null default now()
);
create index idx_photos_answer on answer_photos(answer_id);
-- ---------- signatures (applied on a questionnaire) ----------

create table signatures (
  id uuid primary key default uuid_generate_v4(),
  questionnaire_id uuid not null references questionnaires(id) on delete cascade,
  signer_role signer_role not null,
  full_name text not null,
  phone text,
  position text,
  signature_png_url text not null,   -- bucket 'signatures'
  signed_at timestamptz not null default now(),
  unique (questionnaire_id, signer_role)
);
-- ===========================================================================
-- Row Level Security
-- ===========================================================================

alter table users enable row level security;
alter table certificates enable row level security;
alter table projects enable row level security;
alter table project_signers enable row level security;
alter table templates enable row level security;
alter table questions enable row level security;
alter table questionnaires enable row level security;
alter table answers enable row level security;
alter table answer_photos enable row level security;
alter table signatures enable row level security;
-- users: a row is readable/writable only by its owner
create policy "users self" on users
  for all using (auth.uid() = id) with check (auth.uid() = id);
-- certificates: owner only
create policy "cert owner" on certificates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- projects: owner only
create policy "proj owner" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- signers: accessible if project owner
create policy "signers via project" on project_signers
  for all using (exists (
    select 1 from projects p where p.id = project_id and p.user_id = auth.uid()
  ));
-- templates: system templates readable by everyone; user templates owner only
create policy "templates read" on templates
  for select using (is_system or auth.uid() = owner_id);
create policy "templates write" on templates
  for insert with check (auth.uid() = owner_id and not is_system);
create policy "templates update" on templates
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "templates delete" on templates
  for delete using (auth.uid() = owner_id);
-- questions: visible if parent template is visible
create policy "questions read" on questions
  for select using (exists (
    select 1 from templates t where t.id = template_id and (t.is_system or t.owner_id = auth.uid())
  ));
create policy "questions write" on questions
  for all using (exists (
    select 1 from templates t where t.id = template_id and t.owner_id = auth.uid()
  ));
-- questionnaires: owner only
create policy "quest owner" on questionnaires
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- answers / photos / signatures: via parent questionnaire
create policy "answers via quest" on answers
  for all using (exists (
    select 1 from questionnaires q where q.id = questionnaire_id and q.user_id = auth.uid()
  ));
create policy "photos via answer" on answer_photos
  for all using (exists (
    select 1 from answers a
    join questionnaires q on q.id = a.questionnaire_id
    where a.id = answer_id and q.user_id = auth.uid()
  ));
create policy "signatures via quest" on signatures
  for all using (exists (
    select 1 from questionnaires q where q.id = questionnaire_id and q.user_id = auth.uid()
  ));
-- ===========================================================================
-- Auth trigger: provision users row on signup
-- ===========================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
