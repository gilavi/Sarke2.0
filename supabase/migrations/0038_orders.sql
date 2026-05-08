create table orders (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  document_type text not null default 'labor_safety_specialist',
  form_data     jsonb not null default '{}',
  status        text not null default 'draft' check (status in ('draft', 'completed')),
  pdf_url       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table orders enable row level security;

create policy "owner access" on orders
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
