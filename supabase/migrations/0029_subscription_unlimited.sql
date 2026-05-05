-- Update increment_pdf_count to auto-expire lapsed subscriptions.
-- When a user's subscription_expires_at has passed, their status is set to
-- 'expired' atomically inside this function so they immediately hit the limit
-- on their next PDF attempt — no cron job required.
--
-- Active subscribers (subscription_status='active' AND expires_at > now())
-- bypass the count check entirely and can generate unlimited PDFs.

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
  v_limit      constant integer := 30;
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
