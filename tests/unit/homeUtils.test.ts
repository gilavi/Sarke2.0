import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TIP_KEYS,
  PROJECT_SKELETONS,
  RECENT_SKELETONS,
  greetingFor,
  todayFormatted,
  relativeTime,
  tipOfTheDay,
  groupByDate,
} from '../../lib/homeUtils';

const t = (key: string, opts?: any) =>
  opts ? `${key}:${JSON.stringify(opts)}` : key;

describe('homeUtils', () => {
  describe('constants', () => {
    it('TIP_KEYS has 7 entries', () => {
      expect(TIP_KEYS).toHaveLength(7);
    });

    it('PROJECT_SKELETONS / RECENT_SKELETONS have the expected lengths', () => {
      expect(PROJECT_SKELETONS).toEqual([0, 1]);
      expect(RECENT_SKELETONS).toEqual([0, 1, 2]);
    });
  });

  describe('greetingFor', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('returns night greeting before 5am', () => {
      vi.setSystemTime(new Date('2026-05-26T03:00:00'));
      expect(greetingFor('Gio', t)).toBe('home.greetingNight, Gio');
    });

    it('returns morning greeting between 5am and 12pm', () => {
      vi.setSystemTime(new Date('2026-05-26T09:00:00'));
      expect(greetingFor('Gio', t)).toBe('home.greetingMorning, Gio');
    });

    it('returns afternoon greeting between 12pm and 6pm', () => {
      vi.setSystemTime(new Date('2026-05-26T14:00:00'));
      expect(greetingFor('Gio', t)).toBe('home.greetingAfternoon, Gio');
    });

    it('returns evening greeting at or after 6pm', () => {
      vi.setSystemTime(new Date('2026-05-26T20:00:00'));
      expect(greetingFor('Gio', t)).toBe('home.greetingEvening, Gio');
    });

    it('omits the comma when name is empty', () => {
      vi.setSystemTime(new Date('2026-05-26T09:00:00'));
      expect(greetingFor('', t)).toBe('home.greetingMorning');
    });
  });

  describe('todayFormatted', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('returns a non-empty string for Georgian locale', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const result = todayFormatted('ka');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns a non-empty string for English locale', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const result = todayFormatted('en');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('relativeTime', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('returns relNow for < 1 minute', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:30'));
      const iso = new Date('2026-05-26T12:00:00').toISOString();
      expect(relativeTime(iso, t, 'ka')).toBe('home.relNow');
    });

    it('returns relMinAgo with minutes for < 1 hour', () => {
      vi.setSystemTime(new Date('2026-05-26T12:05:00'));
      const iso = new Date('2026-05-26T12:00:00').toISOString();
      expect(relativeTime(iso, t, 'ka')).toBe('home.relMinAgo:{"n":5}');
    });

    it('returns relHourAgo for < 24 hours', () => {
      vi.setSystemTime(new Date('2026-05-26T14:00:00'));
      const iso = new Date('2026-05-26T12:00:00').toISOString();
      expect(relativeTime(iso, t, 'ka')).toBe('home.relHourAgo:{"n":2}');
    });

    it('returns relDayAgo for < 7 days', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const iso = new Date('2026-05-23T12:00:00').toISOString();
      expect(relativeTime(iso, t, 'ka')).toBe('home.relDayAgo:{"n":3}');
    });

    it('falls through to locale date string for >= 7 days', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const iso = new Date('2026-05-01T12:00:00').toISOString();
      const result = relativeTime(iso, t, 'en');
      expect(result).not.toContain('home.');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('tipOfTheDay', () => {
    it('returns a value from TIP_KEYS', () => {
      const result = tipOfTheDay(t);
      expect((TIP_KEYS as readonly string[]).includes(result)).toBe(true);
    });
  });

  describe('groupByDate', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('returns an empty array for no items', () => {
      expect(groupByDate([], 'ka')).toEqual([]);
    });

    it('labels today/yesterday correctly in Georgian', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const items = [
        { created_at: '2026-05-26T08:00:00' },
        { created_at: '2026-05-25T08:00:00' },
      ];
      const groups = groupByDate(items, 'ka');
      expect(groups).toHaveLength(2);
      expect(groups[0]!.label).toBe('დღეს');
      expect(groups[1]!.label).toBe('გუშინ');
    });

    it('groups items by date and preserves insertion order within a group', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const items = [
        { created_at: '2026-05-26T08:00:00', id: 'a' },
        { created_at: '2026-05-25T08:00:00', id: 'b' },
        { created_at: '2026-05-26T18:00:00', id: 'c' },
      ];
      const groups = groupByDate(items, 'ka');
      expect(groups).toHaveLength(2);
      expect(groups[0]!.items.map((i: any) => i.id)).toEqual(['a', 'c']);
      expect(groups[1]!.items.map((i: any) => i.id)).toEqual(['b']);
    });
  });
});
