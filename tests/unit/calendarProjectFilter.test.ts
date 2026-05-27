/**
 * Unit tests for the projectId filter added to CalendarScreen.
 *
 * The filteredEvents memo in calendar.tsx is:
 *   projectId ? events.filter(e => e.projectId === projectId) : events
 *
 * This file tests that logic as a pure function so no component rendering
 * or router mocking is needed.
 */
import { describe, it, expect } from 'vitest';
import type { CalendarEvent } from '../../lib/calendarEvents';

function applyProjectFilter(
  events: CalendarEvent[],
  projectId: string | undefined,
): CalendarEvent[] {
  return projectId ? events.filter(e => e.projectId === projectId) : events;
}

function makeEvent(id: string, projectId: string): CalendarEvent {
  return {
    id,
    type: 'inspection',
    title: `Event ${id}`,
    projectId,
    projectName: `Project ${projectId}`,
    date: new Date('2026-05-26T10:00:00Z'),
    isPast: false,
    status: 'upcoming',
    entityId: id,
  };
}

const E1 = makeEvent('e1', 'p1');
const E2 = makeEvent('e2', 'p1');
const E3 = makeEvent('e3', 'p2');
const E4 = makeEvent('e4', 'p3');
const EVENTS = [E1, E2, E3, E4];

describe('calendar project filter (filteredEvents logic)', () => {
  it('returns the same array reference when projectId is undefined', () => {
    expect(applyProjectFilter(EVENTS, undefined)).toBe(EVENTS);
  });

  it('returns all events when projectId is undefined', () => {
    expect(applyProjectFilter(EVENTS, undefined)).toHaveLength(4);
  });

  it('keeps only events matching the given projectId', () => {
    const result = applyProjectFilter(EVENTS, 'p1');
    expect(result).toHaveLength(2);
    expect(result).toContain(E1);
    expect(result).toContain(E2);
  });

  it('returns a single event when projectId is unique', () => {
    const result = applyProjectFilter(EVENTS, 'p3');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(E4);
  });

  it('returns empty array when no events match', () => {
    expect(applyProjectFilter(EVENTS, 'no-such-project')).toHaveLength(0);
  });

  it('handles an empty events array', () => {
    expect(applyProjectFilter([], 'p1')).toHaveLength(0);
  });

  it('every event in the result has the correct projectId', () => {
    const result = applyProjectFilter(EVENTS, 'p2');
    expect(result.every(e => e.projectId === 'p2')).toBe(true);
  });
});
