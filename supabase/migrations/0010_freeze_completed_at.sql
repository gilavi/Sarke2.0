-- 0010_freeze_completed_at.sql
--
-- Tighten the freeze trigger from 0008 to also block changes to
-- `completed_at`. Without this, a stale offline flush (or malicious client)
-- can rewrite the completion timestamp on a row marked completed, breaking
-- the audit trail that certificates snapshot against.

create or replace function freeze_completed_inspection()
returns trigger
language plpgsql
as $$
begin
  -- Block meaningful changes — no-op UPDATEs (same values) pass through so
  -- a stale offline flush from the draft era won't get permanently stuck.
  if new.status           is distinct from old.status
     or new.conclusion_text is distinct from old.conclusion_text
     or new.is_safe_for_use is distinct from old.is_safe_for_use
     or new.harness_name    is distinct from old.harness_name
     or new.project_id      is distinct from old.project_id
     or new.project_item_id is distinct from old.project_item_id
     or new.template_id     is distinct from old.template_id
     or new.user_id         is distinct from old.user_id
     or new.completed_at    is distinct from old.completed_at
  then
    raise exception 'Inspection % is completed and cannot be modified', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
