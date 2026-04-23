-- 0006_inspections_certificates.sql
-- Decouple inspections from certificates (the PDF output).
--
-- Conceptual change:
--   * Before: `questionnaires` rows WERE both the inspection AND the PDF —
--     `questionnaires.pdf_url` carried the single generated certificate.
--     Existing `certificates` table actually held the expert's *professional
--     qualifications* (xaracho_inspector etc.) to attach to PDFs as proof.
--   * After:
--       inspections    = immutable record of what happened on site (old
--                        questionnaires table, renamed)
--       qualifications = expert's professional credentials (old certificates
--                        table, renamed — semantics unchanged)
--       certificates   = NEW table: generated PDF derived from an inspection;
--                        one inspection : many certificates over time.
--
-- Backfill policy: every completed inspection with a non-null pdf_url becomes
-- exactly one certificate row (1:1). Inspections without a pdf_url (drafts,
-- or completions that somehow never generated a PDF) get zero certificates.
-- No data loss.
--
-- Signatures are intentionally left on the inspection for now — the signature
-- system is being redesigned separately. Only the FK column name is updated
-- (questionnaire_id → inspection_id).

-- =========================================================================
-- Step 1: rename old `certificates` (qualifications) table
-- =========================================================================

alter table certificates rename to qualifications;

alter index if exists idx_certificates_user rename to idx_qualifications_user;

-- Policy text doesn't reference the table by name (just auth.uid() = user_id),
-- so renaming the table carries the policy correctly. Rename for clarity.
alter policy "cert owner" on qualifications rename to "qual owner";

-- =========================================================================
-- Step 2: rename `questionnaires` → `inspections`
-- =========================================================================

alter table questionnaires rename to inspections;

alter index if exists idx_quest_project rename to idx_insp_project;
alter index if exists idx_quest_user rename to idx_insp_user;
alter index if exists idx_quest_project_item rename to idx_insp_project_item;

-- Policy body only checks user_id; rename for consistency.
alter policy "quest owner" on inspections rename to "insp owner";

-- =========================================================================
-- Step 3: rename FK columns on dependent tables → inspection_id
-- =========================================================================

alter table answers    rename column questionnaire_id to inspection_id;
alter table signatures rename column questionnaire_id to inspection_id;

-- The UNIQUE constraints (answers: questionnaire_id+question_id; signatures:
-- questionnaire_id+signer_role) keep their names but now reference the renamed
-- column. Leave the names — they still function.

-- =========================================================================
-- Step 4: recreate policies that referenced the old table by name
-- =========================================================================
-- Postgres stores policy USING/CHECK clauses as parsed expressions; renaming
-- a referenced relation does not rewrite them. Drop + recreate.

drop policy if exists "answers via quest" on answers;
create policy "answers via insp" on answers
  for all using (exists (
    select 1 from inspections i where i.id = inspection_id and i.user_id = auth.uid()
  ));

drop policy if exists "photos via answer" on answer_photos;
create policy "photos via answer" on answer_photos
  for all using (exists (
    select 1 from answers a
    join inspections i on i.id = a.inspection_id
    where a.id = answer_id and i.user_id = auth.uid()
  ));

drop policy if exists "signatures via quest" on signatures;
create policy "signatures via insp" on signatures
  for all using (exists (
    select 1 from inspections i where i.id = inspection_id and i.user_id = auth.uid()
  ));

-- =========================================================================
-- Step 5: re-attach the schedule-advance trigger to the renamed table
-- =========================================================================
-- The trigger follows the renamed relation automatically, but explicitly
-- re-create for clarity in case anyone inspects pg_trigger later.

drop trigger if exists trg_advance_schedule_on_complete on inspections;
create trigger trg_advance_schedule_on_complete
  after update on inspections
  for each row
  execute function advance_schedule_on_complete();

-- =========================================================================
-- Step 6: NEW `certificates` table — generated PDF from an inspection
-- =========================================================================

create table certificates (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid not null references inspections(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  template_id uuid not null references templates(id),
  pdf_url text not null,              -- storage path in bucket 'pdfs'
  is_safe_for_use boolean,            -- snapshot at generation time
  conclusion_text text,               -- snapshot at generation time
  params jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create index idx_certificates_inspection on certificates(inspection_id);
create index idx_certificates_user on certificates(user_id);

alter table certificates enable row level security;

create policy "cert owner" on certificates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- Step 7: backfill — 1:1 from completed inspections with a pdf_url
-- =========================================================================

insert into certificates (
  id, inspection_id, user_id, template_id, pdf_url,
  is_safe_for_use, conclusion_text, generated_at
)
select
  uuid_generate_v4(),
  i.id,
  i.user_id,
  i.template_id,
  i.pdf_url,
  i.is_safe_for_use,
  i.conclusion_text,
  coalesce(i.completed_at, i.created_at, now())
from inspections i
where i.pdf_url is not null;

-- =========================================================================
-- Step 8: drop inspections.pdf_url — data now lives on certificates.pdf_url
-- =========================================================================

alter table inspections drop column pdf_url;
