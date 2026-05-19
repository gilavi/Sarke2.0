import { describe, it, expect } from 'vitest';
import { cn, fmtDateKa, fmtDateTimeKa, fmtDayMonthKa } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('ignores falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('handles conditional objects', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });
});

const KA_MONTHS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

describe('fmtDateKa', () => {
  it('formats a Date object correctly', () => {
    // Use UTC date constructed explicitly to avoid TZ ambiguity
    const d = new Date(2026, 4, 4); // May 4 2026 local
    expect(fmtDateKa(d)).toBe('04 მაისი 2026');
  });

  it('accepts an ISO string', () => {
    // Build a local-midnight date string so the result is deterministic
    const d = new Date(2026, 0, 15);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(fmtDateKa(iso)).toBe('15 იანვარი 2026');
  });

  it('zero-pads single-digit days', () => {
    expect(fmtDateKa(new Date(2026, 0, 5))).toBe('05 იანვარი 2026');
  });

  it('covers all 12 Georgian month names', () => {
    KA_MONTHS.forEach((name, idx) => {
      const d = new Date(2026, idx, 1);
      expect(fmtDateKa(d)).toContain(name);
    });
  });
});

describe('fmtDateTimeKa', () => {
  it('appends zero-padded HH:MM to the date', () => {
    const d = new Date(2026, 4, 4, 9, 5); // 09:05
    expect(fmtDateTimeKa(d)).toBe('04 მაისი 2026, 09:05');
  });

  it('accepts a string', () => {
    const d = new Date(2026, 11, 31, 23, 59);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
    const result = fmtDateTimeKa(iso);
    expect(result).toContain('დეკემბერი');
    expect(result).toContain('23:59');
  });
});

describe('fmtDayMonthKa', () => {
  it('omits the year', () => {
    const result = fmtDayMonthKa(new Date(2026, 4, 4));
    expect(result).toBe('04 მაისი');
    expect(result).not.toContain('2026');
  });

  it('zero-pads the day', () => {
    expect(fmtDayMonthKa(new Date(2026, 0, 3))).toBe('03 იანვარი');
  });
});
