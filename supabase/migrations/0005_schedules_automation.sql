-- Recurring-inspection automation.
-- When a questionnaire linked to a project_item is completed, advance the
-- matching schedules row (last_inspected_at / next_due_at). Also adds
-- google_event_id for optional Google Calendar sync. Idempotent.

-- ---------- schedules: google calendar sync column ----------

alter table schedules
  add column if not exists google_event_id text;

-- ---------- trigger function ----------

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
  if old.status = 'completed' and old.completed_at is not distinct from new.completed_at then
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

-- ---------- trigger ----------

drop trigger if exists trg_advance_schedule_on_complete on questionnaires;

create trigger trg_advance_schedule_on_complete
  after update on questionnaires
  for each row
  execute function advance_schedule_on_complete();

-- ---------- indexes (kept idempotent; 0003 already created idx_schedules_due) ----------

create index if not exists idx_schedules_due on schedules(next_due_at);
