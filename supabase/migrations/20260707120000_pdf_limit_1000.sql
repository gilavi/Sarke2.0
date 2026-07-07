-- Raise the free-tier PDF allowance from 30 to 1000.
-- Same body as 0029_subscription_unlimited.sql; only v_limit changes.
-- Active subscribers (subscription_status='active' AND expires_at > now())
-- still bypass the count check entirely.

create or replace function increment_pdf_count(user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count      integer;
  v_status     text;
  v_expires_at timestamptz;
  v_limit      constant integer := 1000;
  v_active     boolean;
begin
  if auth.uid() <> user_id then
    raise exception 'unauthorized';
  end if;

  select pdf_count, subscription_status, subscription_expires_at
    into v_count, v_status, v_expires_at
    from users
   where id = user_id
     for update;

  if not found then
    raise exception 'user not found';
  end if;

  -- Auto-expire subscriptions whose term has ended
  if v_status = 'active' and v_expires_at is not null and v_expires_at < now() then
    update users set subscription_status = 'expired' where id = user_id;
    v_status := 'expired';
  end if;

  v_active := v_status = 'active';

  -- Active subscribers bypass the limit entirely
  if not v_active and v_count >= v_limit then
    return jsonb_build_object('allowed', false, 'count', v_count, 'limit', v_limit);
  end if;

  update users set pdf_count = pdf_count + 1 where id = user_id;

  return jsonb_build_object('allowed', true, 'count', v_count + 1, 'limit', v_limit);
end;
$$;
