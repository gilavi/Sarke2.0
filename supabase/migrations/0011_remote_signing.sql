-- Remote signature collection.
--
-- Lets the expert send a tokenized URL (via SMS) to a co-signer who is not on
-- site. The recipient opens the link in mobile Safari, sees an inspection
-- summary + a download link to the PDF, signs on a canvas, and submits.
--
-- Anon (unauthenticated) clients on the web hit:
--   - RPC get_signing_request(token) → returns inspection summary + PDF URL
--   - Direct storage upload to remote-signatures/<token>/<file>.png
--   - RPC submit_signature(token, storage_path) → marks signed
--   - RPC decline_signature(token, reason) → marks declined
--
-- The table itself is anon-deny; only the RPC functions (SECURITY DEFINER)
-- expose token-scoped reads/writes. Storage RLS allows anon INSERT into the
-- bucket only when a matching open request exists.

-- ---------- table ----------

create table remote_signing_requests (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,
  inspection_id uuid not null references inspections(id) on delete cascade,
  expert_user_id uuid not null references users(id) on delete cascade,
  signer_name text not null,
  signer_phone text not null,
  signer_role signer_role not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'signed', 'declined', 'expired')),
  -- A 14-day signed URL minted by the mobile app at create time, pointing at
  -- the latest cert PDF for the inspection. Stored to avoid the web client
  -- needing authenticated access to mint one. Refreshed when the expert
  -- resends or when explicitly rotated.
  pdf_signed_url text,
  signature_png_url text,
  signed_at timestamptz,
  declined_reason text,
  expires_at timestamptz not null default (now() + interval '14 days'),
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_rsr_inspection on remote_signing_requests(inspection_id);
create index idx_rsr_token on remote_signing_requests(token);
create index idx_rsr_expert on remote_signing_requests(expert_user_id);

-- ---------- RLS ----------

alter table remote_signing_requests enable row level security;

-- Authenticated experts: full access to their own requests.
create policy "rsr expert owner" on remote_signing_requests
  for all
  using (auth.uid() = expert_user_id)
  with check (auth.uid() = expert_user_id);

-- Anon role: NO direct table access. Token-scoped reads/writes go through
-- the SECURITY DEFINER RPCs below.

-- ---------- RPC: get_signing_request ----------
-- Returns the inspection summary + signed PDF URL for a valid token.
-- On failure returns { error: 'invalid' | 'expired' | 'consumed' }.
-- Lazy expiry: flips pending/sent rows to 'expired' if expires_at has passed.

create or replace function get_signing_request(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r remote_signing_requests%rowtype;
  v_template_name text;
  v_project_name text;
  v_inspection inspections%rowtype;
  v_expert_name text;
begin
  select * into r from remote_signing_requests where token = p_token;
  if not found then
    return jsonb_build_object('error', 'invalid');
  end if;

  -- Lazy expiry sweep.
  if r.status in ('pending', 'sent') and r.expires_at <= now() then
    update remote_signing_requests
       set status = 'expired'
     where id = r.id;
    return jsonb_build_object('error', 'expired');
  end if;

  if r.status not in ('pending', 'sent') then
    return jsonb_build_object('error', 'consumed', 'status', r.status);
  end if;

  select * into v_inspection from inspections where id = r.inspection_id;
  if not found then
    return jsonb_build_object('error', 'invalid');
  end if;

  select name into v_template_name from templates where id = v_inspection.template_id;
  select name into v_project_name from projects  where id = v_inspection.project_id;
  select coalesce(first_name, '') || ' ' || coalesce(last_name, '')
    into v_expert_name
    from users where id = r.expert_user_id;

  return jsonb_build_object(
    'signer_name', r.signer_name,
    'signer_role', r.signer_role,
    'status', r.status,
    'inspection_title', coalesce(v_template_name, 'ინსპექცია'),
    'project_name', v_project_name,
    'completed_at', v_inspection.completed_at,
    'is_safe_for_use', v_inspection.is_safe_for_use,
    'conclusion_text', v_inspection.conclusion_text,
    'expert_name', trim(v_expert_name),
    'pdf_signed_url', r.pdf_signed_url,
    'expires_at', r.expires_at
  );
end;
$$;

revoke all on function get_signing_request(text) from public;
grant execute on function get_signing_request(text) to anon, authenticated;

-- ---------- RPC: submit_signature ----------
-- Records the signature path against a valid token and marks status='signed'.
-- The web client uploads the PNG directly to storage (RLS-permitted on the
-- remote-signatures bucket); this RPC then "commits" by recording the path.

create or replace function submit_signature(p_token text, p_storage_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r remote_signing_requests%rowtype;
begin
  select * into r from remote_signing_requests where token = p_token for update;
  if not found then
    return jsonb_build_object('error', 'invalid');
  end if;
  if r.status not in ('pending', 'sent') then
    return jsonb_build_object('error', 'consumed', 'status', r.status);
  end if;
  if r.expires_at <= now() then
    update remote_signing_requests set status = 'expired' where id = r.id;
    return jsonb_build_object('error', 'expired');
  end if;

  -- Path must be under remote-signatures/<token>/...
  if p_storage_path is null
     or position(r.token || '/' in p_storage_path) <> 1
  then
    return jsonb_build_object('error', 'bad_path');
  end if;

  update remote_signing_requests
     set signature_png_url = p_storage_path,
         signed_at = now(),
         status = 'signed'
   where id = r.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function submit_signature(text, text) from public;
grant execute on function submit_signature(text, text) to anon, authenticated;

-- ---------- RPC: decline_signature ----------

create or replace function decline_signature(p_token text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r remote_signing_requests%rowtype;
begin
  select * into r from remote_signing_requests where token = p_token for update;
  if not found then
    return jsonb_build_object('error', 'invalid');
  end if;
  if r.status not in ('pending', 'sent') then
    return jsonb_build_object('error', 'consumed', 'status', r.status);
  end if;

  update remote_signing_requests
     set status = 'declined',
         declined_reason = nullif(trim(coalesce(p_reason, '')), '')
   where id = r.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function decline_signature(text, text) from public;
grant execute on function decline_signature(text, text) to anon, authenticated;

-- ---------- storage bucket + policies ----------
-- Bucket creation in Supabase is idempotent via insert ... on conflict.
-- Bucket is private; access governed by storage.objects policies below.

insert into storage.buckets (id, name, public)
values ('remote-signatures', 'remote-signatures', false)
on conflict (id) do nothing;

-- Anon INSERT: allowed only to paths that start with a valid open token,
-- i.e. the first path component (folder) must equal a token whose row is
-- still pending/sent and not expired.
create policy "rsr storage anon insert" on storage.objects
  for insert
  to anon
  with check (
    bucket_id = 'remote-signatures'
    and exists (
      select 1 from remote_signing_requests
       where token = split_part(name, '/', 1)
         and status in ('pending', 'sent')
         and expires_at > now()
    )
  );

-- Anon SELECT: not granted (mobile app fetches via signed URLs as the owner).

-- Authenticated SELECT: experts can read signatures for their own requests.
create policy "rsr storage owner read" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'remote-signatures'
    and exists (
      select 1 from remote_signing_requests r
       where r.token = split_part(name, '/', 1)
         and r.expert_user_id = auth.uid()
    )
  );

-- Authenticated DELETE: experts can clean up their own request files when
-- cancelling or after the row is deleted.
create policy "rsr storage owner delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'remote-signatures'
    and exists (
      select 1 from remote_signing_requests r
       where r.token = split_part(name, '/', 1)
         and r.expert_user_id = auth.uid()
    )
  );
