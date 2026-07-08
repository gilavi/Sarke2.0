// Pure helpers for the History screen's client-side search / project filter
// and offset paging. No React/React Native imports — unit-tested directly in
// tests/unit/historyFeed.test.ts.

/**
 * Offset of the NEXT page given the pages loaded so far, or `undefined` when
 * the last page came back short of `pageSize` (i.e. the feed is exhausted).
 * Feeds `getNextPageParam` in useHistoryFeed.
 */
export function nextPageOffset(
  pages: ReadonlyArray<ReadonlyArray<unknown>>,
  pageSize: number,
): number | undefined {
  const last = pages[pages.length - 1];
  if (!last || last.length < pageSize) return undefined;
  return pages.reduce((n, p) => n + p.length, 0);
}

/**
 * Case-insensitive multi-token match: every whitespace-separated token of
 * `query` must appear somewhere in the joined `parts`. An empty/blank query
 * matches everything (the search field starts empty). Georgian has no
 * upper/lower case, so `toLocaleLowerCase` only affects Latin input.
 */
export function matchesQuery(
  query: string,
  parts: ReadonlyArray<string | null | undefined>,
): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  const hay = parts.filter(Boolean).join(' ').toLocaleLowerCase();
  return q.split(/\s+/).every((token) => hay.includes(token));
}

/**
 * id → display-name map for project lookups in row filters ("company name,
 * else project name" — the same convention InspectionRow subtitles use).
 * Build once per projects-list change instead of `.find()` per row.
 */
export function projectNameMap(
  projects: ReadonlyArray<{ id: string; name: string; company_name: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of projects) map.set(p.id, p.company_name || p.name);
  return map;
}
