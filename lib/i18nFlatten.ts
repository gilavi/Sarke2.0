// Flatten / unflatten for the i18n runtime overlay (lib/i18nOverlay.ts) and the
// CMS seed (scripts/seed-ui-strings.mjs). Pure functions, NO React Native or
// Supabase imports, so they're unit-testable under vitest (tests/unit).
//
// Convention (MUST stay in sync with scripts/seed-ui-strings.mjs):
//   - nested objects join their keys with '.'  → "common.save"
//   - arrays use numeric segments               → "calendar.monthLabels.0"
//   - only STRING leaves are represented; numbers/booleans/null stay bundled-only
//     (the CMS edits text, not structure).

export type FlatStrings = Record<string, string>;

/** Flatten a nested i18n object to dotted-path → string entries (string leaves only). */
export function flatten(obj: unknown, prefix = '', out: FlatStrings = {}): FlatStrings {
  if (obj === null || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object') {
      flatten(v, key, out);
    } else if (typeof v === 'string') {
      out[key] = v;
    }
  }
  return out;
}

/**
 * Rebuild a nested object from rows of `{ key, [lang] }`. A numeric next-segment
 * creates an array, so calendar.monthLabels.0..11 round-trips back to an array.
 * Rows whose value for `lang` is not a string are skipped.
 */
export function unflatten(
  rows: Array<Record<string, unknown>>,
  lang: string,
): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const row of rows) {
    const value = row[lang];
    const key = row.key;
    if (typeof value !== 'string' || typeof key !== 'string') continue;
    const segs = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = root;
    for (let i = 0; i < segs.length - 1; i++) {
      const seg = segs[i];
      const childIsIndex = /^\d+$/.test(segs[i + 1]);
      if (node[seg] == null) node[seg] = childIsIndex ? [] : {};
      node = node[seg];
    }
    node[segs[segs.length - 1]] = value;
  }
  return root;
}
