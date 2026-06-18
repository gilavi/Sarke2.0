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

    // Georgian manual construction - verifies we no longer rely on 'ka-GE' ICU data.
    // 2026-05-26 = Tuesday (getDay()=2) → KA_WEEKDAY_FULL[2]='სამშაბათი', May → 'მაისი'.
    it('Georgian - contains correct weekday and month name', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const result = todayFormatted('ka');
      expect(result).toContain('სამშაბათი');  // Tuesday in Georgian
      expect(result).toContain('26');
      expect(result).toContain('მაისი');       // May in Georgian
    });

    it('Georgian - full string is "<weekday> <day> <month>"', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      expect(todayFormatted('ka')).toBe('სამშაბათი 26 მაისი');
    });

    it('ka-GE prefix also uses manual Georgian construction', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const result = todayFormatted('ka-GE');
      expect(result).toBe('სამშაბათი 26 მაისი');
    });

    it('English - contains the month name "May"', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const result = todayFormatted('en');
      expect(result).toContain('May');
    });

    it('English - contains the day number 26', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      expect(todayFormatted('en')).toContain('26');
    });

    it('Georgian - January uses correct month name', () => {
      vi.setSystemTime(new Date('2026-01-05T12:00:00'));
      expect(todayFormatted('ka')).toContain('იანვარი');
      expect(todayFormatted('ka')).toContain('5');
    });

    it('Georgian - December uses correct month name', () => {
      vi.setSystemTime(new Date('2026-12-15T12:00:00'));
      expect(todayFormatted('ka')).toContain('დეკემბერი');
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

    it('falls through to locale date string for >= 7 days (en)', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const iso = new Date('2026-05-01T12:00:00').toISOString();
      const result = relativeTime(iso, t, 'en');
      expect(result).not.toContain('home.');
      expect(result.length).toBeGreaterThan(0);
    });

    // Georgian manual construction for dates >= 7 days ago.
    // KA_MONTH_SHORT[4] = 'მაი' (May).  d.getDate() = 1.
    it('Georgian - >= 7 days returns "<day> <short-month>" without locale API', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const iso = new Date('2026-05-01T12:00:00').toISOString();
      expect(relativeTime(iso, t, 'ka')).toBe('1 მაი');
    });

    it('Georgian - >= 7 days uses correct short month for January', () => {
      vi.setSystemTime(new Date('2026-02-20T12:00:00'));
      const iso = new Date('2026-01-10T12:00:00').toISOString();
      expect(relativeTime(iso, t, 'ka')).toBe('10 იან');
    });

    it('Georgian - >= 7 days uses correct short month for December', () => {
      vi.setSystemTime(new Date('2026-12-31T12:00:00'));
      const iso = new Date('2026-12-01T12:00:00').toISOString();
      expect(relativeTime(iso, t, 'ka')).toBe('1 დეკ');
    });

    it('English - >= 7 days result does not contain Georgian characters', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const iso = new Date('2026-05-01T12:00:00').toISOString();
      const result = relativeTime(iso, t, 'en-US');
      expect(result).not.toMatch(/[ა-ჿ]/);  // no Georgian Unicode block
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

    // English labels - added when dateGroupLabel was made language-aware.
    it('labels today/yesterday as "Today"/"Yesterday" in English', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const items = [
        { created_at: '2026-05-26T08:00:00' },
        { created_at: '2026-05-25T08:00:00' },
      ];
      const groups = groupByDate(items, 'en');
      expect(groups).toHaveLength(2);
      expect(groups[0]!.label).toBe('Today');
      expect(groups[1]!.label).toBe('Yesterday');
    });

    it('en-US prefix also produces English today/yesterday labels', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const items = [
        { created_at: '2026-05-26T08:00:00' },
        { created_at: '2026-05-25T08:00:00' },
      ];
      const groups = groupByDate(items, 'en-US');
      expect(groups[0]!.label).toBe('Today');
      expect(groups[1]!.label).toBe('Yesterday');
    });

    // Georgian manual date for older entries - KA_MONTH_SHORT[4]='მაი', day=20.
    it('Georgian - older entries use manual "<day> <short-month>" label', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const items = [{ created_at: '2026-05-20T08:00:00' }];
      const groups = groupByDate(items, 'ka');
      expect(groups[0]!.label).toBe('20 მაი');
    });

    it('English - older entries produce a non-empty non-Georgian label', () => {
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      const items = [{ created_at: '2026-05-10T08:00:00' }];
      const groups = groupByDate(items, 'en');
      const label = groups[0]!.label;
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toMatch(/[ა-ჿ]/);
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
