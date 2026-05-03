import type { Inspection, Briefing, Template, Project } from '../types/models';
import type { ScheduleStore } from './calendarSchedule';

export type CalendarEventStatus = 'completed' | 'due_today' | 'overdue' | 'upcoming';

export type CalendarEvent = {
  /** Unique React key. "insp-past-{id}" | "insp-future-{id}" | "brief-past-{id}" | "brief-future-{id}" */
  id: string;
  type: 'inspection' | 'briefing';
  title: string;
  projectId: string;
  projectName: string;
  /** completedAt for past events; effectiveDueDate for future events */
  date: Date;
  isPast: boolean;
  status: CalendarEventStatus;
  /** The actual DB row id (used for navigation) */
  entityId: string;
  templateId?: string;
};

// ── Date helpers ─────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ── Main builder ─────────────────────────────────────────────────────────────

/**
 * Builds a flat, date-sorted list of CalendarEvent from DB data + the
 * schedule store. Pure function — no side effects.
 *
 * PAST events: one per completed inspection/briefing (shows history).
 * FUTURE events: one per (project, template) group for inspections,
 *                one per project for briefings (shows what's next).
 */
export function buildCalendarEvents(
  inspections: Inspection[],
  briefings: Briefing[],
  templates: Template[],
  projects: Project[],
  store: ScheduleStore,
): CalendarEvent[] {
  const today = startOfDay(new Date());
  const templateMap = new Map(templates.map(t => [t.id, t]));
  const projectMap = new Map(projects.map(p => [p.id, p]));
  const events: CalendarEvent[] = [];

  // ── PAST: completed inspections ──────────────────────────────────────────
  for (const insp of inspections) {
    if (insp.status !== 'completed' || !insp.completed_at) continue;
    const project = projectMap.get(insp.project_id);
    const template = templateMap.get(insp.template_id);
    events.push({
      id: `insp-past-${insp.id}`,
      type: 'inspection',
      title: template?.name ?? 'შემოწმება',
      projectId: insp.project_id,
      projectName: project?.name ?? '',
      date: new Date(insp.completed_at),
      isPast: true,
      status: 'completed',
      entityId: insp.id,
      templateId: insp.template_id,
    });
  }

  // ── PAST: completed briefings ────────────────────────────────────────────
  for (const brief of briefings) {
    if (brief.status !== 'completed') continue;
    const project = projectMap.get(brief.projectId);
    events.push({
      id: `brief-past-${brief.id}`,
      type: 'briefing',
      title: briefingTitle(brief),
      projectId: brief.projectId,
      projectName: project?.name ?? '',
      date: new Date(brief.dateTime),
      isPast: true,
      status: 'completed',
      entityId: brief.id,
    });
  }

  // ── FUTURE: most recent completed inspection per (project, template) ─────
  const latestInspByGroup = new Map<string, Inspection>();
  for (const insp of inspections) {
    if (insp.status !== 'completed' || !insp.completed_at) continue;
    const key = `${insp.project_id}:${insp.template_id}`;
    const existing = latestInspByGroup.get(key);
    if (!existing || new Date(insp.completed_at) > new Date(existing.completed_at!)) {
      latestInspByGroup.set(key, insp);
    }
  }

  for (const [, insp] of latestInspByGroup) {
    const storeEntry = store.inspections[insp.id];
    if (!storeEntry) continue;
    const effectiveDue = new Date(storeEntry.nextDueDateOverride ?? storeEntry.nextDueDate);
    const due = startOfDay(effectiveDue);
    const project = projectMap.get(insp.project_id);
    const template = templateMap.get(insp.template_id);
    events.push({
      id: `insp-future-${insp.id}`,
      type: 'inspection',
      title: template?.name ?? 'შემოწმება',
      projectId: insp.project_id,
      projectName: project?.name ?? '',
      date: effectiveDue,
      isPast: false,
      status: classifyFuture(due, today),
      entityId: insp.id,
      templateId: insp.template_id,
    });
  }

  // ── FUTURE: most recent completed briefing per project ───────────────────
  const latestBriefByProject = new Map<string, Briefing>();
  for (const brief of briefings) {
    if (brief.status !== 'completed') continue;
    const existing = latestBriefByProject.get(brief.projectId);
    if (!existing || new Date(brief.dateTime) > new Date(existing.dateTime)) {
      latestBriefByProject.set(brief.projectId, brief);
    }
  }

  for (const [, brief] of latestBriefByProject) {
    const storeEntry = store.briefings[brief.id];
    if (!storeEntry) continue;
    const effectiveDue = new Date(storeEntry.nextDueDateOverride ?? storeEntry.nextDueDate);
    const due = startOfDay(effectiveDue);
    const project = projectMap.get(brief.projectId);
    events.push({
      id: `brief-future-${brief.id}`,
      type: 'briefing',
      title: briefingTitle(brief),
      projectId: brief.projectId,
      projectName: project?.name ?? '',
      date: effectiveDue,
      isPast: false,
      status: classifyFuture(due, today),
      entityId: brief.id,
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function classifyFuture(due: Date, today: Date): CalendarEventStatus {
  if (isSameDay(due, today)) return 'due_today';
  if (due < today) return 'overdue';
  return 'upcoming';
}

function briefingTitle(brief: Briefing): string {
  const nonCustom = brief.topics.filter(t => !t.startsWith('custom:'));
  return nonCustom.length > 0 ? nonCustom.join(', ') : 'ინსტრუქტაჟი';
}

// ── Query helpers ────────────────────────────────────────────────────────────

/** Events that fall on a specific calendar day (any status). */
export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter(e => isSameDay(e.date, day));
}

/**
 * Statuses present on a given day — drives the dot row under each day cell.
 * At most one of each status type.
 */
export function dotStatusesForDay(
  events: CalendarEvent[],
  day: Date,
): Set<CalendarEventStatus> {
  const statuses = new Set<CalendarEventStatus>();
  for (const e of eventsForDay(events, day)) {
    statuses.add(e.status);
  }
  return statuses;
}

/** Overdue + due_today future events — used for the tab badge count. */
export function getOverdueCount(events: CalendarEvent[]): number {
  return events.filter(e => !e.isPast && (e.status === 'overdue' || e.status === 'due_today')).length;
}

/**
 * All future (upcoming/due/overdue) events for a given project, sorted by date.
 * Used by the project screen "მომავალი" section.
 */
export function eventsForProject(events: CalendarEvent[], projectId: string): CalendarEvent[] {
  return events
    .filter(e => e.projectId === projectId && !e.isPast)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
