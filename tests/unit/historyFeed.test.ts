import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchesQuery, nextPageOffset, projectNameMap } from '../../features/history/historyListUtils';

// History pagination + client-side search (features/history):
//   - nextPageOffset drives useHistoryFeed's getNextPageParam (offset pages,
//     stop on a short page);
//   - matchesQuery / projectNameMap power the search field + project filter;
//   - the record feeds translate `offset` into a PostgREST `.range()` read
//     (and never call `.limit()` for pages past the first).

describe('nextPageOffset', () => {
  it('returns the total loaded count while pages come back full', () => {
    expect(nextPageOffset([Array(50)], 50)).toBe(50);
    expect(nextPageOffset([Array(50), Array(50)], 50)).toBe(100);
  });

  it('returns undefined once the last page is short (feed exhausted)', () => {
    expect(nextPageOffset([Array(50), Array(12)], 50)).toBeUndefined();
    expect(nextPageOffset([Array(3)], 50)).toBeUndefined();
    expect(nextPageOffset([[]], 50)).toBeUndefined();
    expect(nextPageOffset([], 50)).toBeUndefined();
  });
});

describe('matchesQuery', () => {
  it('matches when every token appears across the joined parts', () => {
    expect(matchesQuery('ხარაჩო', ['ხარაჩოს შემოწმება', 'ვაკის ობიექტი'])).toBe(true);
    expect(matchesQuery('ხარაჩო ვაკის', ['ხარაჩოს შემოწმება', 'ვაკის ობიექტი'])).toBe(true);
    expect(matchesQuery('ამწე', ['ხარაჩოს შემოწმება', 'ვაკის ობიექტი'])).toBe(false);
  });

  it('is case-insensitive for Latin text and ignores null/empty parts', () => {
    expect(matchesQuery('acme', ['ACME Construction', null, undefined])).toBe(true);
  });

  it('empty or whitespace-only query matches everything', () => {
    expect(matchesQuery('', ['whatever'])).toBe(true);
    expect(matchesQuery('   ', [null])).toBe(true);
  });
});

describe('projectNameMap', () => {
  it('prefers company_name and falls back to name', () => {
    const map = projectNameMap([
      { id: 'p1', name: 'ობიექტი 1', company_name: 'შპს მშენებელი' },
      { id: 'p2', name: 'ობიექტი 2', company_name: '' },
    ]);
    expect(map.get('p1')).toBe('შპს მშენებელი');
    expect(map.get('p2')).toBe('ობიექტი 2');
  });
});

// ── Paged service reads (`offset` → `.range()`) ──────────────────────────────

type QueryResult = { data: unknown; error: { code?: string; message: string } | null };

function makeBuilder(result: QueryResult) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'range', 'in']) {
    b[m] = vi.fn(() => b);
  }
  (b as { then: unknown }).then = (
    onOk: (v: QueryResult) => unknown,
    onErr?: (e: unknown) => unknown,
  ) => Promise.resolve(result).then(onOk, onErr);
  return b as Record<'select' | 'eq' | 'order' | 'limit' | 'range' | 'in', ReturnType<typeof vi.fn>> & {
    then: unknown;
  };
}

const builders: Record<string, ReturnType<typeof makeBuilder>> = {};
let resultsByTable: Record<string, QueryResult>;

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const result = resultsByTable[table] ?? { data: [], error: null };
      builders[table] = makeBuilder(result);
      return builders[table];
    },
    rpc: vi.fn(),
  },
  STORAGE_BUCKETS: {},
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
}));
vi.mock('../../lib/logError', () => ({ logError: vi.fn(), toErrorMessage: (e: unknown) => String(e) }));

beforeEach(() => {
  vi.resetModules();
  for (const k of Object.keys(builders)) delete builders[k];
  resultsByTable = {};
});

describe('recent({ limit, offset }) pages via .range()', () => {
  it('reportsApi.recent uses .range(offset, offset + limit - 1) and skips .limit', async () => {
    resultsByTable = { reports: { data: [], error: null } };
    const { reportsApi } = await import('../../lib/services/real/reports');
    await reportsApi.recent({ status: 'completed', limit: 50, offset: 50 });
    expect(builders.reports.range).toHaveBeenCalledWith(50, 99);
    expect(builders.reports.limit).not.toHaveBeenCalled();
  });

  it('reportsApi.recent keeps plain .limit for the first page (no offset)', async () => {
    resultsByTable = { reports: { data: [], error: null } };
    const { reportsApi } = await import('../../lib/services/real/reports');
    await reportsApi.recent({ status: 'completed', limit: 50 });
    expect(builders.reports.limit).toHaveBeenCalledWith(50);
    expect(builders.reports.range).not.toHaveBeenCalled();
  });

  it('briefingsApi.recent forwards offset through the lean-view fetchList', async () => {
    resultsByTable = { briefings_list_lean: { data: [], error: null } };
    const { briefingsApi } = await import('../../lib/briefingsApi');
    await briefingsApi.recent({ status: 'completed', limit: 50, offset: 100 });
    expect(builders.briefings_list_lean.range).toHaveBeenCalledWith(100, 149);
    expect(builders.briefings_list_lean.limit).not.toHaveBeenCalled();
  });

  it('ordersApi.recent forwards offset through the lean-view fetchList', async () => {
    resultsByTable = { orders_list_lean: { data: [], error: null } };
    const { ordersApi } = await import('../../lib/ordersApi');
    await ordersApi.recent({ status: 'completed', limit: 50, offset: 50 });
    expect(builders.orders_list_lean.range).toHaveBeenCalledWith(50, 99);
  });
});
