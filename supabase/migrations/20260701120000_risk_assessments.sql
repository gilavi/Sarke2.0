-- 20260701120000 risk_assessments
-- Per-project "რისკების შეფასება" (risk assessment) register. One row per saved
-- document. Two document types share this table, discriminated by doc_type:
--   'risk_assessment'   — multi-row hazard table with a×ш scoring + residual risk
--   'ppe_determination' — PPE-by-job-position matrix (იდს განსაზღვრა)
-- header:     JSONB record of the document's header fields (per doc_type).
-- entries:    JSONB array of row objects (RiskHazardEntry[] or PpeEntry[]).
-- signatories JSONB record of { role: { name, position, signature, date } }.

create table public.risk_assessments (
  id          uuid        not null default gen_random_uuid() primary key,
  project_id  uuid        not null references public.projects(id) on delete cascade,
  user_id     uuid        not null references auth.users(id),
  doc_type    text        not null
                          check (doc_type in ('risk_assessment', 'ppe_determination')),
  header      jsonb       not null default '{}'::jsonb,
  entries     jsonb       not null default '[]'::jsonb,
  signatories jsonb       not null default '{}'::jsonb,
  status      text        not null default 'draft'
                          check (status in ('draft', 'completed')),
  pdf_url     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.risk_assessments enable row level security;

create policy "Users manage own risk assessments"
  on public.risk_assessments for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index risk_assessments_project_created_idx
  on public.risk_assessments (project_id, created_at desc);
