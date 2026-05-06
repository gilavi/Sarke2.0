import { describe, it, expect } from 'vitest';
import { formatShortDate, formatShortDateTime } from '../../lib/formatDate';

describe('formatDate', () => {
  describe('formatShortDate', () => {
    it('formats ISO date in Georgian', () => {
      expect(formatShortDate('2026-05-06T00:00:00Z')).toBe('06 მაი 2026');
      expect(formatShortDate('2026-01-15T00:00:00Z')).toBe('15 იან 2026');
      expect(formatShortDate('2026-12-25T00:00:00Z')).toBe('25 დეკ 2026');
    });

    it('returns empty string for null/undefined/empty', () => {
      expect(formatShortDate(null)).toBe('');
      expect(formatShortDate(undefined)).toBe('');
      expect(formatShortDate('')).toBe('');
    });

    it('returns empty string for invalid date', () => {
      expect(formatShortDate('not-a-date')).toBe('');
      expect(formatShortDate('2026-13-45')).toBe('');
    });
  });

  describe('formatShortDateTime', () => {
    it('formats ISO datetime in Georgian', () => {
      const result = formatShortDateTime('2026-05-06T00:00:00Z');
      expect(result).toContain('06 მაი');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('returns empty string for invalid input', () => {
      expect(formatShortDateTime(null)).toBe('');
      expect(formatShortDateTime('')).toBe('');
    });
  });
});
