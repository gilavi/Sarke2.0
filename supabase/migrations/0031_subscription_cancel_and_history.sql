-- Subscription cancellation flag + payment history table.
--
-- Cancel: sets subscription_cancelled_at; access continues until subscription_expires_at
-- (no immediate downgrade). Auto-renewal isn't wired yet so this is purely a UX flag —
-- once it's set, the cancel button hides and renew CTA shows.
--
-- payment_records: every BOG callback (success or failure) writes a row here so the
-- /account page on web and the mobile More tab can render real payment history.

alter table users
  add column if not exists subscription_cancelled_at timestamptz;

create table if not exists payment_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bog_order_id  text not null,
  amount        numeric(10, 2),
  currency      text,
  status        text not null check (status in ('pending', 'success', 'failed', 'refunded')),
  raw_callback  jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists payment_records_user_created_idx
  on payment_records (user_id, created_at desc);

create unique index if not exists payment_records_order_status_idx
  on payment_records (bog_order_id, status);

alter table payment_records enable row level security;

drop policy if exists payment_records_select_own on payment_records;
create policy payment_records_select_own on payment_records
  for select using (auth.uid() = user_id);

-- cancel_subscription
--
-- Idempotent — calling on an already-cancelled subscription is a no-op and still
-- returns the active_until timestamp so the UI can render "access until …" text.
-- Returns null active_until if the user has no active subscription (free tier).
create or replace function cancel_subscription(user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status     text;
  v_expires_at timestamptz;
  v_cancelled  timestamptz;
begin
  if auth.uid() <> user_id then
    raise exception 'unauthorized';
  end if;

  select subscription_status, subscription_expires_at, subscription_cancelled_at
    into v_status, v_expires_at, v_cancelled
    from users
   where id = user_id
     for update;

  if not found then
    raise exception 'user not found';
  end if;

  if v_status <> 'active' then
    return jsonb_build_object('cancelled', false, 'active_until', null);
  end if;

  if v_cancelled is null then
    update users
       set subscription_cancelled_at = now()
     where id = user_id;
  end if;

  return jsonb_build_object(
    'cancelled', true,
    'active_until', v_expires_at
  );
end;
$$;

grant execute on function cancel_subscription(uuid) to authenticated;
