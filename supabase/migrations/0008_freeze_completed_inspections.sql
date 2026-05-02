-- 0008_freeze_completed_inspections.sql
--
-- Once an inspection flips to status='completed' it becomes an immutable
-- record — editing answers, photos, conclusion, or the status itself is a
-- bug (the rendered certificate PDFs are snapshots of that moment). Enforce
-- the invariant server-side so bugs don't silently corrupt audit trails.
--
-- Allowed on a completed inspection:
--   * NO column changes on `inspections` itself (including no un-completion).
--   * NO inserts/updates/deletes to `answers` or `answer_photos` that
--     reference a completed inspection.
--   * Signatures are still allowed to change because the signature redesign
--     is pending — when that lands, signatures will move onto certificates
--     and this exception drops.
--   * Certificates (PDF rows) can be inserted and deleted freely; they're
--     derived artefacts, not part of the inspection record.
--
-- Exception: the `advance_schedule_on_complete` trigger from 0005 runs
-- AFTER UPDATE and needs the row to already be completed — that's fine, it
-- doesn't call UPDATE on the inspection itself.

-- =========================================================================
-- Trigger: block any mutation on a completed inspections row
-- =========================================================================

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
  then
    raise exception 'Inspection % is completed and cannot be modified', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_freeze_completed_inspection on inspections;
create trigger trg_freeze_completed_inspection
  before update on inspections
  for each row
  when (old.status = 'completed')
  execute function freeze_completed_inspection();

-- =========================================================================
-- Trigger: block answer writes when the parent inspection is completed
-- =========================================================================

create or replace function block_answer_write_when_completed()
returns trigger
language plpgsql
as $$
declare
  v_status questionnaire_status;
  v_inspection_id uuid;
begin
  v_inspection_id := coalesce(new.inspection_id, old.inspection_id);
  select status into v_status from inspections where id = v_inspection_id;
  if v_status = 'completed' then
    raise exception 'Cannot modify answer: parent inspection % is completed', v_inspection_id
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_block_answer_write on answers;
create trigger trg_block_answer_write
  before insert or update or delete on answers
  for each row
  execute function block_answer_write_when_completed();

-- =========================================================================
-- Trigger: block answer_photos writes when the parent inspection is completed
-- =========================================================================

create or replace function block_answer_photo_write_when_completed()
returns trigger
language plpgsql
as $$
declare
  v_status questionnaire_status;
  v_answer_id uuid;
  v_inspection_id uuid;
begin
  v_answer_id := coalesce(new.answer_id, old.answer_id);
  select a.inspection_id into v_inspection_id
    from answers a where a.id = v_answer_id;
  if v_inspection_id is null then
    return coalesce(new, old);
  end if;
  select status into v_status from inspections where id = v_inspection_id;
  if v_status = 'completed' then
    raise exception 'Cannot modify answer photo: parent inspection % is completed', v_inspection_id
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_block_answer_photo_write on answer_photos;
create trigger trg_block_answer_photo_write
  before insert or update or delete on answer_photos
  for each row
  execute function block_answer_photo_write_when_completed();
