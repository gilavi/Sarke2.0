import { describe, it, expect, vi, beforeEach } from 'vitest';

// Lean list feeds (migration 20260708120000_lean_list_feeds.sql):
//   - briefingsApi list reads go through the briefings_list_lean view
//     (signature payloads stripped) and fall back to the base table when the
//     view isn't deployed;
//   - ordersApi list reads do the same via orders_list_lean;
//   - certificatesApi.countsByInspection prefers the get_certificate_counts
//     RPC and falls back to the legacy fetch-and-count path.

type QueryResult = { data: unknown; error: { code?: string; message: string } | null };

/** Chainable thenable that mimics the supabase query builder. */
function makeBuilder(result: QueryResult) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'in']) {
    b[m] = vi.fn(() => b);
  }
  (b as { then: unknown }).then = (
    onOk: (v: QueryResult) => unknown,
    onErr?: (e: unknown) => unknown,
  ) => Promise.resolve(result).then(onOk, onErr);
  return b as {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    then: unknown;
  };
}

const fromCalls: string[] = [];
let resultsByTable: Record<string, QueryResult[]>;
const mockRpc = vi.fn();

function nextResult(table: string): QueryResult {
  const queue = resultsByTable[table];
  if (!queue || queue.length === 0) throw new Error(`no scripted result for table ${table}`);
  return queue.length > 1 ? (queue.shift() as QueryResult) : queue[0];
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      fromCalls.push(table);
      return makeBuilder(nextResult(table));
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
  STORAGE_BUCKETS: {},
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
}));
vi.mock('../../lib/logError', () => ({ logError: vi.fn(), toErrorMessage: (e: unknown) => String(e) }));

const MISSING_VIEW = { code: 'PGRST205', message: 'relation not found in schema cache' };

const briefingRow = {
  id: 'b1',
  project_id: 'p1',
  user_id: 'u1',
  date_time: '2026-07-01T10:00:00Z',
  topics: ['ppe'],
  participants: [{ name: 'გიორგი', signature: null }],
  inspector_signature: null,
  inspector_name: 'ინსპექტორი',
  status: 'completed',
  created_at: '2026-07-01T10:00:00Z',
};

const orderRow = {
  id: 'o1',
  project_id: 'p1',
  user_id: 'u1',
  document_type: 'labor_safety_specialist',
  form_data: { orderNumber: '7' },
  status: 'completed',
  pdf_url: null,
  pdf_hash: null,
  created_at: '2026-07-01T10:00:00Z',
  updated_at: '2026-07-01T10:00:00Z',
};

beforeEach(() => {
  vi.resetModules(); // fresh module-level leanViewAvailable flags per test
  fromCalls.length = 0;
  mockRpc.mockReset();
  resultsByTable = {};
});

describe('briefingsApi lean list reads', () => {
  it('reads recent() from briefings_list_lean and maps rows', async () => {
    resultsByTable = { briefings_list_lean: [{ data: [briefingRow], error: null }] };
    const { briefingsApi } = await import('../../lib/briefingsApi');
    const rows = await briefingsApi.recent({ status: 'completed', limit: 50 });
    expect(fromCalls).toEqual(['briefings_list_lean']);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('b1');
    expect(rows[0].participants).toHaveLength(1);
    expect(rows[0].inspectorSignature).toBeNull();
  });

  it('falls back to the base table when the view is missing, and skips the view afterwards', async () => {
    resultsByTable = {
      briefings_list_lean: [{ data: null, error: MISSING_VIEW }],
      briefings: [{ data: [briefingRow], error: null }],
    };
    const { briefingsApi } = await import('../../lib/briefingsApi');
    const rows = await briefingsApi.recent({});
    expect(rows).toHaveLength(1);
    expect(fromCalls).toEqual(['briefings_list_lean', 'briefings']);

    fromCalls.length = 0;
    await briefingsApi.listByProject('p1');
    expect(fromCalls).toEqual(['briefings']); // no doomed retry of the view
  });

  it('throws non-missing errors instead of silently falling back', async () => {
    resultsByTable = {
      briefings_list_lean: [{ data: null, error: { message: 'permission denied' } }],
    };
    const { briefingsApi } = await import('../../lib/briefingsApi');
    await expect(briefingsApi.listAll()).rejects.toThrow('permission denied');
    expect(fromCalls).toEqual(['briefings_list_lean']);
  });
});

describe('ordersApi lean list reads', () => {
  it('reads recent() from orders_list_lean and maps rows', async () => {
    resultsByTable = { orders_list_lean: [{ data: [orderRow], error: null }] };
    const { ordersApi } = await import('../../lib/ordersApi');
    const rows = await ordersApi.recent({ status: 'completed' });
    expect(fromCalls).toEqual(['orders_list_lean']);
    expect(rows[0].documentType).toBe('labor_safety_specialist');
    expect(rows[0].formData).toEqual({ orderNumber: '7' });
  });

  it('falls back to the base table when the view is missing', async () => {
    resultsByTable = {
      orders_list_lean: [{ data: null, error: MISSING_VIEW }],
      orders: [{ data: [orderRow], error: null }],
    };
    const { ordersApi } = await import('../../lib/ordersApi');
    const rows = await ordersApi.listByProject('p1');
    expect(rows).toHaveLength(1);
    expect(fromCalls).toEqual(['orders_list_lean', 'orders']);
  });
});

describe('certificatesApi.countsByInspection', () => {
  it('uses the get_certificate_counts RPC and coerces bigint-as-string counts', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { inspection_id: 'i1', cert_count: 2 },
        { inspection_id: 'i2', cert_count: '5' },
      ],
      error: null,
    });
    const { certificatesApi } = await import('../../lib/services/real/qualifications');
    const counts = await certificatesApi.countsByInspection(['i1', 'i2', 'i3']);
    expect(mockRpc).toHaveBeenCalledWith('get_certificate_counts', {
      p_inspection_ids: ['i1', 'i2', 'i3'],
    });
    expect(counts).toEqual({ i1: 2, i2: 5 });
    expect(fromCalls).toEqual([]); // no per-certificate row fetch
  });

  it('falls back to counting fetched rows when the RPC is missing', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'function not found in schema cache' },
    });
    resultsByTable = {
      certificates: [
        { data: [{ inspection_id: 'i1' }, { inspection_id: 'i1' }, { inspection_id: 'i2' }], error: null },
      ],
    };
    const { certificatesApi } = await import('../../lib/services/real/qualifications');
    const counts = await certificatesApi.countsByInspection(['i1', 'i2']);
    expect(counts).toEqual({ i1: 2, i2: 1 });
    expect(fromCalls).toEqual(['certificates']);

    // The missing RPC is not retried on subsequent calls.
    mockRpc.mockClear();
    await certificatesApi.countsByInspection(['i1']);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('throws non-missing RPC errors instead of silently falling back', async () => {
    const rpcError = { code: '42501', message: 'permission denied' };
    mockRpc.mockResolvedValue({ data: null, error: rpcError });
    const { certificatesApi } = await import('../../lib/services/real/qualifications');
    await expect(certificatesApi.countsByInspection(['i1'])).rejects.toBe(rpcError);
  });

  it('returns {} without any network call for an empty id list', async () => {
    const { certificatesApi } = await import('../../lib/services/real/qualifications');
    expect(await certificatesApi.countsByInspection([])).toEqual({});
    expect(mockRpc).not.toHaveBeenCalled();
    expect(fromCalls).toEqual([]);
  });
});
