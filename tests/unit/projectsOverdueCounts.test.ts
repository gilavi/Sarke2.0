import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: { rpc: (...args: any[]) => mockRpc(...args) },
  STORAGE_BUCKETS: {},
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
}));

// projects.ts pulls in a chain of helpers; stub the ones we don't exercise.
vi.mock('../../lib/photoCompression', () => ({ compressPhoto: vi.fn() }));
vi.mock('../../lib/logError', () => ({ logError: vi.fn(), toErrorMessage: (e: unknown) => String(e) }));
// projects.ts imports expo-file-system/legacy + expo-crypto which transitively
// require __DEV__ and other React Native globals. Stub them so the module load
// in a Node/jsdom test environment doesn't blow up.
vi.mock('expo-file-system/legacy', () => ({
  uploadAsync: vi.fn(),
  deleteAsync: vi.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 'BINARY_CONTENT' },
}));
vi.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-0000-0000-000000000000' }));

const { projectsApi } = await import('../../lib/services/real/projects');

beforeEach(() => {
  mockRpc.mockReset();
});

describe('projectsApi.overdueCounts', () => {
  it('calls the get_overdue_counts RPC with no arguments', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await projectsApi.overdueCounts();
    expect(mockRpc).toHaveBeenCalledWith('get_overdue_counts');
  });

  it('returns an empty map when the RPC yields no rows', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    expect(await projectsApi.overdueCounts()).toEqual({});
  });

  it('returns an empty map when the RPC yields null data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    expect(await projectsApi.overdueCounts()).toEqual({});
  });

  it('maps RPC rows into a project_id → count record', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { project_id: 'p1', overdue_count: 3 },
        { project_id: 'p2', overdue_count: 1 },
      ],
      error: null,
    });
    expect(await projectsApi.overdueCounts()).toEqual({ p1: 3, p2: 1 });
  });

  it('coerces bigint-as-string counts to numbers (Postgres returns bigint as string over the wire)', async () => {
    mockRpc.mockResolvedValue({
      data: [{ project_id: 'p1', overdue_count: '7' as unknown as number }],
      error: null,
    });
    const result = await projectsApi.overdueCounts();
    expect(result).toEqual({ p1: 7 });
    expect(typeof result.p1).toBe('number');
  });

  it('rethrows RPC errors so the React Query layer can surface them', async () => {
    const rpcError = new Error('RLS denied');
    mockRpc.mockResolvedValue({ data: null, error: rpcError });
    await expect(projectsApi.overdueCounts()).rejects.toBe(rpcError);
  });
});
