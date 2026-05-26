import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recordRedirect,
  isOscillating,
  isAnyOscillationBetween,
  clearRedirectHistory,
} from '../../lib/navigationGuard';

describe('navigationGuard', () => {
  beforeEach(() => clearRedirectHistory());
  afterEach(() => vi.useRealTimers());

  describe('isOscillating', () => {
    it('returns false on a clean history', () => {
      expect(isOscillating('a', 'b')).toBe(false);
    });

    it('returns false after exactly 2 redirects (not strictly greater than MAX_OSCILLATIONS=2)', () => {
      recordRedirect('a', 'b');
      recordRedirect('a', 'b');
      expect(isOscillating('a', 'b')).toBe(false);
    });

    it('returns true after 3 redirects of the same pair', () => {
      recordRedirect('a', 'b');
      recordRedirect('a', 'b');
      recordRedirect('a', 'b');
      expect(isOscillating('a', 'b')).toBe(true);
    });

    it('does not detect oscillation for unrelated pairs', () => {
      recordRedirect('a', 'b');
      recordRedirect('a', 'b');
      recordRedirect('a', 'b');
      expect(isOscillating('x', 'y')).toBe(false);
    });
  });

  describe('isAnyOscillationBetween', () => {
    it('detects oscillation across both directions combined', () => {
      recordRedirect('a', 'b');
      recordRedirect('b', 'a');
      recordRedirect('a', 'b');
      expect(isAnyOscillationBetween('a', 'b')).toBe(true);
      expect(isAnyOscillationBetween('b', 'a')).toBe(true);
    });

    it('returns false when fewer than 3 redirects involve the pair', () => {
      recordRedirect('a', 'b');
      recordRedirect('b', 'a');
      expect(isAnyOscillationBetween('a', 'b')).toBe(false);
    });

    it('ignores unrelated pairs', () => {
      recordRedirect('a', 'b');
      recordRedirect('b', 'a');
      recordRedirect('a', 'b');
      expect(isAnyOscillationBetween('x', 'y')).toBe(false);
    });
  });

  describe('pruneOld (via window expiry)', () => {
    it('drops events older than the 5s window', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-26T12:00:00'));
      recordRedirect('a', 'b');
      recordRedirect('a', 'b');
      recordRedirect('a', 'b');
      expect(isOscillating('a', 'b')).toBe(true);

      vi.setSystemTime(new Date('2026-05-26T12:00:06'));
      expect(isOscillating('a', 'b')).toBe(false);
    });
  });

  describe('clearRedirectHistory', () => {
    it('empties the history', () => {
      recordRedirect('a', 'b');
      recordRedirect('a', 'b');
      recordRedirect('a', 'b');
      expect(isOscillating('a', 'b')).toBe(true);
      clearRedirectHistory();
      expect(isOscillating('a', 'b')).toBe(false);
    });
  });
});
