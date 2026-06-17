import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: { rpc: (...args: any[]) => mockRpc(...args) },
  STORAGE_BUCKETS: {},
}));

vi.mock('../../lib/logError', () => ({ logError: vi.fn(), toErrorMessage: (e: unknown) => String(e) }));
vi.mock('../../lib/guards', () => ({ isInspection: () => true }));
// inspections.ts pulls in storage.ts (uses expo-file-system) - stub it out so
// loading the module under test in a Node env doesn't drag in native globals.
vi.mock('../../lib/services/real/storage', () => ({ storageApi: { uploadFromUri: vi.fn() } }));
vi.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-0000-0000-000000000000' }));

const { inspectionsApi } = await import('../../lib/services/real/inspections');

beforeEach(() => {
  mockRpc.mockReset();
});

describe('inspectionsApi.unifiedByProject', () => {
  it('calls get_project_inspections_unified with the project id', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await inspectionsApi.unifiedByProject('p-123');
    expect(mockRpc).toHaveBeenCalledWith('get_project_inspections_unified', {
      p_project_id: 'p-123',
    });
  });

  it('returns RPC rows as-is (preserving the unified preview shape)', async () => {
    const rows = [
      { id: 'i1', source: 'bobcat', template_id: 't1', status: 'completed', created_at: '2026-05-20T10:00:00Z' },
      { id: 'i2', source: 'harness', template_id: 't2', status: 'draft', created_at: '2026-05-19T10:00:00Z' },
    ];
    mockRpc.mockResolvedValue({ data: rows, error: null });
    expect(await inspectionsApi.unifiedByProject('p-123')).toEqual(rows);
  });

  it('returns an empty array when the RPC yields null data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    expect(await inspectionsApi.unifiedByProject('p-123')).toEqual([]);
  });

  it('rethrows RPC errors so React Query can surface them', async () => {
    const rpcError = new Error('function does not exist (migration not applied)');
    mockRpc.mockResolvedValue({ data: null, error: rpcError });
    await expect(inspectionsApi.unifiedByProject('p-123')).rejects.toBe(rpcError);
  });
});
