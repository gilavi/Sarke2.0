-- 20260623150000_allow_inspection_reopen.sql
--
-- Document-edit feature (Reopen → Edit → Re-complete).
--
-- The 0008/0010 freeze makes a COMPLETED generic inspection immutable so the
-- rendered certificate PDF stays a faithful snapshot. To let a user CORRECT a
-- finished inspection we reopen it back to draft, edit via the existing wizard,
-- then re-complete (regenerating the PDF + re-capturing the in-memory signature).
--
-- This migration relaxes the freeze just enough to permit ONE explicit escape —
-- an owner-initiated un-complete — while a row that REMAINS completed stays
-- fully frozen. It also tightens the schedule-advance trigger so re-completing a
-- reopened inspection does not advance `schedules.next_due_at` a second time
-- (a correction is not a fresh inspection event).
--
-- Scope: GENERIC inspections only (parent `inspections` + `answers`). Equipment
-- inspections (`<type>_inspections`) carry their own `status` column and are not
-- guarded by any freeze trigger, so their reopen is a plain UPDATE handled in the
-- application layer — nothing to change here.
--
-- RLS unchanged: the "insp owner" policy already restricts every UPDATE to the
-- row's owner, so the reopen is owner-initiated by construction.

-- =========================================================================
-- 1. Relax freeze_completed_inspection() to admit an explicit reopen.
-- =========================================================================
-- Escape hatch: status flips completed -> draft AND completed_at is nulled in
-- the same UPDATE. That shape is unambiguous (a stale offline flush from the
-- draft era never nulls completed_at), so it cannot be triggered accidentally.
-- Every other update that leaves the row completed keeps the 0008/0010 freeze.
--
-- Answer / answer_photo writes do not need a companion change: their
-- block_answer_write_when_completed() / block_answer_photo_write_when_completed()
-- triggers read the PARENT inspection status, which is now 'draft' during the
-- edit, so those writes unblock automatically.

create or replace function freeze_completed_inspection()
returns trigger
language plpgsql
as $$
begin
  -- Explicit owner reopen: un-complete the row so the wizard can edit it.
  if new.status = 'draft' and new.completed_at is null then
    return new;
  end if;

  -- Otherwise the row stays completed — keep the original freeze. No-op
  -- UPDATEs (same values) still pass because every check is `is distinct from`.
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

-- =========================================================================
-- 2. Guard advance_schedule_on_complete() against double-advance.
-- =========================================================================
-- Original (0005) guard skipped re-advance only when an already-completed row
-- was updated WITHOUT changing completed_at. After a reopen, re-completion
-- writes a fresh completed_at, so that guard would let it advance a second time.
--
-- New rule: advance only on the rising edge draft -> completed. After a reopen
-- the row is draft (completed_at null), so re-completion is a genuine rising
-- edge and advances exactly once; a row already completed never re-advances.
-- This is the only behavioral change vs. 0005 (the body is otherwise identical).

create or replace function advance_schedule_on_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_completed_at timestamptz := coalesce(new.completed_at, now());
begin
  -- Only act on draft → completed transitions for item-linked questionnaires.
  if new.project_item_id is null then
    return new;
  end if;
  if new.status <> 'completed' then
    return new;
  end if;
  -- Rising edge only: a row that was already completed never re-advances the
  -- schedule (editing a completed inspection is a correction, not a new event).
  if old.status = 'completed' then
    return new;
  end if;

  select id into v_existing_id
    from schedules
    where project_item_id = new.project_item_id
    limit 1;

  if v_existing_id is null then
    insert into schedules (project_item_id, last_inspected_at, next_due_at, interval_days)
    values (
      new.project_item_id,
      v_completed_at,
      v_completed_at + (10 * interval '1 day'),
      10
    );
  else
    update schedules
      set last_inspected_at = v_completed_at,
          next_due_at = v_completed_at + (interval_days * interval '1 day')
      where id = v_existing_id;
  end if;

  return new;
end;
$$;
