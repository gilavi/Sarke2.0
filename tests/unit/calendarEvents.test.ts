import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildCalendarEvents,
  isSameDay,
  eventsForDay,
  dotStatusesForDay,
  getOverdueCount,
  eventsForProject,
} from '../../lib/calendarEvents';

function insp(over: Partial<any> = {}): any {
  return {
    id: 'i1',
    project_id: 'p1',
    template_id: 't1',
    status: 'completed',
    completed_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

function brief(over: Partial<any> = {}): any {
  return {
    id: 'b1',
    projectId: 'p1',
    dateTime: '2026-05-20T10:00:00Z',
    status: 'completed',
    topics: ['safety_basics'],
    ...over,
  };
}

function template(over: Partial<any> = {}): any {
  return { id: 't1', name: 'ექსკავატორის ტექნიკური შემოწმების აქტი', ...over };
}

function project(over: Partial<any> = {}): any {
  return { id: 'p1', name: 'Project P1', company_name: 'Acme Ltd', ...over };
}

function store(over: Partial<any> = {}): any {
  return { inspections: {}, briefings: {}, ...over };
}

describe('calendarEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  describe('isSameDay', () => {
    it('returns true for two dates on the same calendar day', () => {
      expect(isSameDay(new Date('2026-05-26T01:00:00'), new Date('2026-05-26T23:00:00'))).toBe(true);
    });

    it('returns false for different days', () => {
      expect(isSameDay(new Date('2026-05-26T23:00:00'), new Date('2026-05-27T00:00:00'))).toBe(false);
    });

    it('returns false for different months', () => {
      expect(isSameDay(new Date('2026-05-26'), new Date('2026-06-26'))).toBe(false);
    });

    it('returns false for different years', () => {
      expect(isSameDay(new Date('2026-05-26'), new Date('2025-05-26'))).toBe(false);
    });
  });

  describe('buildCalendarEvents', () => {
    it('returns no events when nothing is completed', () => {
      const events = buildCalendarEvents(
        [insp({ status: 'draft' })],
        [brief({ status: 'draft' })],
        [template()],
        [project()],
        store(),
      );
      expect(events).toEqual([]);
    });

    it('emits a past event for each completed inspection', () => {
      const events = buildCalendarEvents(
        [insp()],
        [],
        [template()],
        [project()],
        store(),
      );
      expect(events).toHaveLength(1);
      expect(events[0]!.id).toBe('insp-past-i1');
      expect(events[0]!.type).toBe('inspection');
      expect(events[0]!.isPast).toBe(true);
      expect(events[0]!.status).toBe('completed');
      expect(events[0]!.title).toBe('ექსკავატორის ტექნიკური შემოწმების აქტი');
      expect(events[0]!.projectName).toBe('Acme Ltd');
      expect(events[0]!.entityId).toBe('i1');
    });

    it('falls back to generic title when template is missing', () => {
      const events = buildCalendarEvents(
        [insp({ template_id: 'missing' })],
        [],
        [],
        [project()],
        store(),
      );
      expect(events[0]!.title).toBe('შემოწმება');
    });

    it('uses project.name when company_name is missing', () => {
      const events = buildCalendarEvents(
        [insp()],
        [],
        [template()],
        [project({ company_name: undefined })],
        store(),
      );
      expect(events[0]!.projectName).toBe('Project P1');
    });

    it('emits a past briefing event with a topic-joined title', () => {
      const events = buildCalendarEvents(
        [],
        [brief({ topics: ['fire', 'falls'] })],
        [],
        [project()],
        store(),
      );
      expect(events).toHaveLength(1);
      expect(events[0]!.id).toBe('brief-past-b1');
      expect(events[0]!.title).toBe('fire, falls');
    });

    it('uses fallback briefing title when only custom topics remain', () => {
      const events = buildCalendarEvents(
        [],
        [brief({ topics: ['custom:something'] })],
        [],
        [project()],
        store(),
      );
      expect(events[0]!.title).toBe('ინსტრუქტაჟი');
    });

    it('emits a future event when the schedule store has an entry', () => {
      const events = buildCalendarEvents(
        [insp()],
        [],
        [template()],
        [project()],
        store({
          inspections: { i1: { nextDueDate: '2026-05-28T10:00:00Z' } },
        }),
      );
      const future = events.find(e => !e.isPast);
      expect(future).toBeDefined();
      expect(future!.id).toBe('insp-future-i1');
      expect(future!.status).toBe('upcoming');
    });

    it('marks future event as due_today when due date is today', () => {
      const events = buildCalendarEvents(
        [insp()],
        [],
        [template()],
        [project()],
        store({
          inspections: { i1: { nextDueDate: '2026-05-26T18:00:00' } },
        }),
      );
      expect(events.find(e => !e.isPast)!.status).toBe('due_today');
    });

    it('marks future event as overdue when due date is before today', () => {
      const events = buildCalendarEvents(
        [insp()],
        [],
        [template()],
        [project()],
        store({
          inspections: { i1: { nextDueDate: '2026-05-20T10:00:00' } },
        }),
      );
      expect(events.find(e => !e.isPast)!.status).toBe('overdue');
    });

    it('respects nextDueDateOverride for future event scheduling', () => {
      const events = buildCalendarEvents(
        [insp()],
        [],
        [template()],
        [project()],
        store({
          inspections: {
            i1: {
              nextDueDate: '2026-05-28T10:00:00Z',
              nextDueDateOverride: '2026-05-26T10:00:00',
            },
          },
        }),
      );
      expect(events.find(e => !e.isPast)!.status).toBe('due_today');
    });

    it('picks the most recent completed inspection per (project, template) for the future slot', () => {
      const events = buildCalendarEvents(
        [
          insp({ id: 'old', completed_at: '2026-05-15T10:00:00Z' }),
          insp({ id: 'new', completed_at: '2026-05-22T10:00:00Z' }),
        ],
        [],
        [template()],
        [project()],
        store({
          inspections: {
            old: { nextDueDate: '2026-06-01T10:00:00Z' },
            new: { nextDueDate: '2026-06-01T10:00:00Z' },
          },
        }),
      );
      const future = events.filter(e => !e.isPast);
      expect(future).toHaveLength(1);
      expect(future[0]!.entityId).toBe('new');
    });

    it('picks the most recent completed briefing per project for the future slot', () => {
      const events = buildCalendarEvents(
        [],
        [
          brief({ id: 'old', dateTime: '2026-05-15T10:00:00Z' }),
          brief({ id: 'new', dateTime: '2026-05-22T10:00:00Z' }),
        ],
        [],
        [project()],
        store({
          briefings: {
            old: { nextDueDate: '2026-06-01T10:00:00Z' },
            new: { nextDueDate: '2026-06-01T10:00:00Z' },
          },
        }),
      );
      const future = events.filter(e => !e.isPast);
      expect(future).toHaveLength(1);
      expect(future[0]!.entityId).toBe('new');
    });

    it('sorts events ascending by date', () => {
      const events = buildCalendarEvents(
        [
          insp({ id: 'i_late', completed_at: '2026-05-22T10:00:00Z', template_id: 't1' }),
          insp({ id: 'i_early', completed_at: '2026-05-10T10:00:00Z', template_id: 't2' }),
        ],
        [],
        [template(), template({ id: 't2', name: 'Other' })],
        [project()],
        store(),
      );
      expect(events[0]!.entityId).toBe('i_early');
      expect(events[1]!.entityId).toBe('i_late');
    });

    it('skips inspections without completed_at', () => {
      const events = buildCalendarEvents(
        [insp({ completed_at: null })],
        [],
        [template()],
        [project()],
        store(),
      );
      expect(events).toEqual([]);
    });

    it('skips future events when no store entry exists', () => {
      const events = buildCalendarEvents(
        [insp()],
        [],
        [template()],
        [project()],
        store(),
      );
      expect(events.filter(e => !e.isPast)).toHaveLength(0);
    });
  });

  describe('eventsForDay', () => {
    it('filters events to ones whose date is the given day', () => {
      const events = buildCalendarEvents(
        [insp({ completed_at: '2026-05-20T10:00:00Z' })],
        [],
        [template()],
        [project()],
        store(),
      );
      expect(eventsForDay(events, new Date('2026-05-20T18:00:00'))).toHaveLength(1);
      expect(eventsForDay(events, new Date('2026-05-21T10:00:00'))).toHaveLength(0);
    });
  });

  describe('dotStatusesForDay', () => {
    it('returns the set of unique statuses for a day', () => {
      const events = buildCalendarEvents(
        [insp()],
        [brief()],
        [template()],
        [project()],
        store(),
      );
      const dots = dotStatusesForDay(events, new Date('2026-05-20T10:00:00Z'));
      expect(dots.has('completed')).toBe(true);
      expect(dots.size).toBe(1);
    });
  });

  describe('getOverdueCount', () => {
    it('counts only future events that are overdue or due_today', () => {
      const events = buildCalendarEvents(
        [
          insp({ id: 'a', template_id: 'ta' }),
          insp({ id: 'b', template_id: 'tb' }),
        ],
        [],
        [template({ id: 'ta' }), template({ id: 'tb' })],
        [project()],
        store({
          inspections: {
            a: { nextDueDate: '2026-05-20T10:00:00' }, // overdue
            b: { nextDueDate: '2026-05-26T10:00:00' }, // due_today
          },
        }),
      );
      expect(getOverdueCount(events)).toBe(2);
    });

    it('excludes upcoming and past events from the count', () => {
      const events = buildCalendarEvents(
        [insp()],
        [],
        [template()],
        [project()],
        store({
          inspections: { i1: { nextDueDate: '2026-06-20T10:00:00Z' } },
        }),
      );
      expect(getOverdueCount(events)).toBe(0);
    });
  });

  describe('eventsForProject', () => {
    it('returns future events for the given project, sorted by date', () => {
      const events = buildCalendarEvents(
        [
          insp({ id: 'a', template_id: 'ta', project_id: 'p1' }),
          insp({ id: 'b', template_id: 'tb', project_id: 'p2' }),
        ],
        [],
        [template({ id: 'ta' }), template({ id: 'tb' })],
        [project(), project({ id: 'p2', name: 'Other' })],
        store({
          inspections: {
            a: { nextDueDate: '2026-06-01T10:00:00Z' },
            b: { nextDueDate: '2026-06-02T10:00:00Z' },
          },
        }),
      );
      const p1 = eventsForProject(events, 'p1');
      expect(p1).toHaveLength(1);
      expect(p1[0]!.entityId).toBe('a');
    });

    it('excludes past events', () => {
      const events = buildCalendarEvents(
        [insp()],
        [],
        [template()],
        [project()],
        store(),
      );
      expect(eventsForProject(events, 'p1')).toEqual([]);
    });
  });
});
