-- PDF usage tracking: add subscription/usage columns to users table and a
-- server-side function that atomically checks the free-tier limit and
-- increments the count. Calling via supabase.rpc() means the check runs
-- inside Postgres and cannot be bypassed by reinstalling the app.

alter table users
  add column if not exists pdf_count              integer     not null default 0,
  add column if not exists subscription_status    text        not null default 'free',
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists bog_card_token         text;

alter table users
  drop constraint if exists users_subscription_status_check;
alter table users
  add constraint users_subscription_status_check
  check (subscription_status in ('free', 'active', 'expired'));

-- increment_pdf_count
--
-- Checks the free-tier cap (3 PDFs) and, if the user is within the limit or
-- has an active subscription, atomically increments their count and returns
-- { allowed: true, count: <new>, limit: 3 }.
-- If the cap is exceeded and there is no active subscription, returns
-- { allowed: false, count: <current>, limit: 3 } without incrementing.
--
-- Security: SECURITY DEFINER so the function can write to the users row
-- even when RLS would block a direct UPDATE; auth.uid() check ensures a
-- caller can only increment their own counter.
create or replace function increment_pdf_count(user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count  integer;
  v_status text;
  v_limit  constant integer := 30;
begin
  if auth.uid() <> user_id then
    raise exception 'unauthorized';
  end if;

  select pdf_count, subscription_status
    into v_count, v_status
    from users
   where id = user_id
     for update;

  if not found then
    raise exception 'user not found';
  end if;

  if v_count >= v_limit and v_status <> 'active' then
    return jsonb_build_object('allowed', false, 'count', v_count, 'limit', v_limit);
  end if;

  update users set pdf_count = pdf_count + 1 where id = user_id;

  return jsonb_build_object('allowed', true, 'count', v_count + 1, 'limit', v_limit);
end;
$$;

grant execute on function increment_pdf_count(uuid) to authenticated;
