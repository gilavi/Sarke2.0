import { vi } from 'vitest';

export function createMockSupabaseClient(overrides: any = {}) {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: { first_name: 'Test', last_name: 'User' },
  };

  const mockSession = {
    user: mockUser,
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() + 3600,
  };

  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  }));

  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: { path: 'mock-path' }, error: null })),
      download: vi.fn(() => Promise.resolve({ data: new Blob(), error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://mock.url/file.png' } })),
      remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  };

  const mockAuth = {
    signInWithPassword: vi.fn(() => Promise.resolve({ data: { session: mockSession, user: mockUser }, error: null })),
    signUp: vi.fn(() => Promise.resolve({ data: { session: mockSession, user: mockUser }, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: null, error: null })),
    updateUser: vi.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
    verifyOtp: vi.fn(() => Promise.resolve({ data: { session: mockSession, user: mockUser }, error: null })),
    resend: vi.fn(() => Promise.resolve({ data: null, error: null })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: mockSession }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    exchangeCodeForSession: vi.fn(() => Promise.resolve({ data: { session: mockSession }, error: null })),
    ...overrides.auth,
  };

  const mockRpc = vi.fn(() => Promise.resolve({ data: null, error: null }));

  return {
    auth: mockAuth,
    from: mockFrom,
    storage: mockStorage,
    rpc: mockRpc,
    ...overrides,
  };
}

export const mockSupabaseClient = createMockSupabaseClient();
