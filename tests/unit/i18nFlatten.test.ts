import { describe, it, expect } from 'vitest';
import { flatten, unflatten } from '../../lib/i18nFlatten';
import en from '../../locales/en.json';
import ka from '../../locales/ka.json';

// Rows as fetchUiStrings() builds them from the ui_strings table.
function rowsFromFlat(flat: Record<string, string>, lang: 'en' | 'ka') {
  return Object.entries(flat).map(([key, value]) => ({ key, [lang]: value }));
}

describe('i18n flatten/unflatten round-trip', () => {
  it('en.json survives flatten → rows → unflatten at the flat level', () => {
    const flat = flatten(en);
    const rebuilt = unflatten(rowsFromFlat(flat, 'en'), 'en');
    // String-leaf identity: every translatable value is preserved exactly.
    expect(flatten(rebuilt)).toEqual(flat);
  });

  it('ka.json survives flatten → rows → unflatten at the flat level', () => {
    const flat = flatten(ka);
    const rebuilt = unflatten(rowsFromFlat(flat, 'ka'), 'ka');
    expect(flatten(rebuilt)).toEqual(flat);
  });

  it('reconstructs arrays from numeric segments (e.g. calendar.monthLabels)', () => {
    const rebuilt = unflatten(
      [
        { key: 'calendar.monthLabels.0', en: 'Jan' },
        { key: 'calendar.monthLabels.1', en: 'Feb' },
        { key: 'calendar.monthLabels.2', en: 'Mar' },
      ],
      'en',
    ) as { calendar: { monthLabels: string[] } };
    expect(Array.isArray(rebuilt.calendar.monthLabels)).toBe(true);
    expect(rebuilt.calendar.monthLabels).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('reconstructs deeply nested objects', () => {
    const rebuilt = unflatten([{ key: 'a.b.c.d', ka: 'ღ' }], 'ka');
    expect(rebuilt).toEqual({ a: { b: { c: { d: 'ღ' } } } });
  });

  it('skips rows whose value for the requested language is null', () => {
    const rebuilt = unflatten([{ key: 'common.save', en: null, ka: 'შენახვა' }], 'en');
    expect(rebuilt).toEqual({});
  });

  it('flatten keeps only string leaves (ignores numbers/booleans)', () => {
    const flat = flatten({ a: 'x', n: 3, b: true, nested: { s: 'y' } });
    expect(flat).toEqual({ a: 'x', 'nested.s': 'y' });
  });
});
