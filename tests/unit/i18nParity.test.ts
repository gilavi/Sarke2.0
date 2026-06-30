import { describe, it, expect } from 'vitest';
import { flatten } from '../../lib/i18nFlatten';
import en from '../../locales/en.json';
import ka from '../../locales/ka.json';

// Locks in the result of the full text audit: every UI string must exist in
// BOTH languages (no ka-only or en-only keys), and the {{placeholder}} tokens
// must match per key so interpolation never breaks in one language. If you add
// a key, add it to both files — this test is the guard that keeps them in sync.

const flatEn = flatten(en);
const flatKa = flatten(ka);

const keysEn = Object.keys(flatEn).sort();
const keysKa = Object.keys(flatKa).sort();

/** Sorted multiset of `{{token}}` placeholders inside a translation string. */
function placeholders(value: string): string[] {
  return (value.match(/{{\s*[\w.]+\s*}}/g) ?? [])
    .map((t) => t.replace(/\s+/g, ''))
    .sort();
}

describe('i18n ka ↔ en parity', () => {
  it('has the exact same set of keys in both languages', () => {
    const onlyEn = keysEn.filter((k) => !(k in flatKa));
    const onlyKa = keysKa.filter((k) => !(k in flatEn));
    expect({ onlyEn, onlyKa }).toEqual({ onlyEn: [], onlyKa: [] });
  });

  it('has identical placeholders for every shared key', () => {
    const mismatches = keysEn
      .filter((k) => k in flatKa)
      .map((k) => ({ key: k, en: placeholders(flatEn[k]), ka: placeholders(flatKa[k]) }))
      .filter((m) => JSON.stringify(m.en) !== JSON.stringify(m.ka));
    expect(mismatches).toEqual([]);
  });

  it('has no empty/whitespace-only translations', () => {
    const blankEn = keysEn.filter((k) => flatEn[k].trim() === '');
    const blankKa = keysKa.filter((k) => flatKa[k].trim() === '');
    expect({ blankEn, blankKa }).toEqual({ blankEn: [], blankKa: [] });
  });
});
