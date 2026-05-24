import type { Schedule, ScheduleWithItem } from '../../../types/models';
import { load, now, save, uuid } from './_store';

export const schedulesApi = {
  list: async (): Promise<ScheduleWithItem[]> => {
    const db = await load();
    return db.schedules.map(s => {
      const item = db.project_items.find(i => i.id === s.project_item_id) ?? null;
      const project = item
        ? db.projects.find(p => p.id === item.project_id) ?? null
        : null;
      return {
        ...s,
        project_items: item
          ? {
              id: item.id,
              name: item.name,
              project_id: item.project_id,
              projects: project
                ? { id: project.id, name: project.name, company_name: project.company_name }
                : null,
            }
          : null,
      };
    });
  },
  upcoming: async (fromIso: string, toIso: string): Promise<ScheduleWithItem[]> => {
    const all = await schedulesApi.list();
    return all.filter(s => {
      if (!s.next_due_at) return false;
      return s.next_due_at >= fromIso && s.next_due_at <= toIso;
    });
  },
  markInspected: async (
    scheduleId: string,
    completedAtIso: string,
  ): Promise<Schedule> => {
    const db = await load();
    const s = db.schedules.find(x => x.id === scheduleId);
    if (!s) throw new Error('not found');
    s.last_inspected_at = completedAtIso;
    s.next_due_at = new Date(
      new Date(completedAtIso).getTime() + s.interval_days * 864e5,
    ).toISOString();
    await save();
    return s;
  },
  upsertForItem: async (
    projectItemId: string,
    intervalDays = 10,
  ): Promise<Schedule> => {
    const db = await load();
    let s = db.schedules.find(x => x.project_item_id === projectItemId);
    if (s) return s;
    s = {
      id: uuid(),
      project_item_id: projectItemId,
      last_inspected_at: null,
      next_due_at: new Date(Date.now() + intervalDays * 864e5).toISOString(),
      interval_days: intervalDays,
      google_event_id: null,
      created_at: now(),
    };
    db.schedules.push(s);
    await save();
    return s;
  },
  setGoogleEventId: async (scheduleId: string, googleEventId: string | null) => {
    const db = await load();
    const s = db.schedules.find(x => x.id === scheduleId);
    if (!s) return;
    s.google_event_id = googleEventId;
    await save();
  },
};
