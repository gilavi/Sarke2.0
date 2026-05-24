import { supabase } from '../../supabase';
import type { Schedule, ScheduleWithItem } from '../../../types/models';
import { throwIfError } from './_shared';

const SCHEDULE_JOIN =
  '*, project_items!inner(id, name, project_id, projects!inner(id, name, company_name))';

export const schedulesApi = {
  /** All schedules the current user can see (joined with item + project). */
  list: async (): Promise<ScheduleWithItem[]> => {
    const { data, error } = await supabase
      .from('schedules')
      .select(SCHEDULE_JOIN)
      .order('next_due_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ScheduleWithItem[];
  },
  /** Schedules with next_due_at falling between fromIso and toIso (inclusive). */
  upcoming: async (fromIso: string, toIso: string): Promise<ScheduleWithItem[]> => {
    const { data, error } = await supabase
      .from('schedules')
      .select(SCHEDULE_JOIN)
      .gte('next_due_at', fromIso)
      .lte('next_due_at', toIso)
      .order('next_due_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ScheduleWithItem[];
  },
  /** Manually mark an item as inspected now. Normally the DB trigger handles this. */
  markInspected: async (scheduleId: string, completedAtIso: string): Promise<Schedule> => {
    const existing = await supabase
      .from('schedules')
      .select('interval_days')
      .eq('id', scheduleId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    const intervalDays =
      ((existing.data as { interval_days?: number } | null)?.interval_days) ?? 10;
    const completed = new Date(completedAtIso);
    const next = new Date(completed.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    return throwIfError<Schedule>(
      await supabase
        .from('schedules')
        .update({
          last_inspected_at: completedAtIso,
          next_due_at: next.toISOString(),
        })
        .eq('id', scheduleId)
        .select()
        .single(),
    );
  },
  /** Ensure a schedules row exists for an item; default interval 10 days. */
  upsertForItem: async (projectItemId: string, intervalDays = 10): Promise<Schedule> => {
    const existing = await supabase
      .from('schedules')
      .select('*')
      .eq('project_item_id', projectItemId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return existing.data as Schedule;
    return throwIfError<Schedule>(
      await supabase
        .from('schedules')
        .insert({
          project_item_id: projectItemId,
          interval_days: intervalDays,
          next_due_at: new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single(),
    );
  },
  /** Persist the Google Calendar event id after a successful sync. */
  setGoogleEventId: async (scheduleId: string, googleEventId: string | null) => {
    const { error } = await supabase
      .from('schedules')
      .update({ google_event_id: googleEventId })
      .eq('id', scheduleId);
    if (error) throw error;
  },
};
