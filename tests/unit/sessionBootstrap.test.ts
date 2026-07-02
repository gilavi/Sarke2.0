/**
 * Unit tests for the offline session boot primitives (lib/sessionBootstrap.ts):
 * reading the raw supabase auth blob without network, and the cached users-row
 * profile that lets the app render fully signed-in offline.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
  },
}));

const secureGetItem = vi.fn<(k: string) => Promise<string | null>>();
vi.mock('../../lib/secureSessionStorage', () => ({
  secureSessionStorage: { getItem: (k: string) => secureGetItem(k) },
}));

vi.mock('../../lib/supabase', () => ({
  SUPABASE_AUTH_STORAGE_KEY: 'sb-testref-auth-token',
}));

import {
  readStoredSession,
  cacheUserProfile,
  readCachedUserProfile,
} from '../../lib/sessionBootstrap';
import type { AppUser } from '../../types/models';

const validBlob = {
  access_token: 'jwt-abc',
  refresh_token: 'rt-def',
  token_type: 'bearer',
  // deliberately in the past — offline boot must accept an expired session
  expires_at: 1_000_000,
  user: { id: 'user-1', email: 'x@y.z' },
};

beforeEach(() => {
  store.clear();
  secureGetItem.mockReset();
});

describe('readStoredSession', () => {
  it('reads the blob under the supabase storage key', async () => {
    secureGetItem.mockResolvedValue(JSON.stringify(validBlob));
    const s = await readStoredSession();
    expect(secureGetItem).toHaveBeenCalledWith('sb-testref-auth-token');
    expect(s?.user.id).toBe('user-1');
    expect(s?.access_token).toBe('jwt-abc');
  });

  it('returns the session even when expires_at is in the past', async () => {
    secureGetItem.mockResolvedValue(JSON.stringify(validBlob));
    const s = await readStoredSession();
    expect(s).not.toBeNull();
    expect(s?.expires_at).toBe(1_000_000);
  });

  it('returns null when no blob exists (signed out / fresh install)', async () => {
    secureGetItem.mockResolvedValue(null);
    expect(await readStoredSession()).toBeNull();
  });

  it('returns null on corrupt JSON', async () => {
    secureGetItem.mockResolvedValue('{not json');
    expect(await readStoredSession()).toBeNull();
  });

  it('returns null when the blob lacks an access token or user id', async () => {
    secureGetItem.mockResolvedValue(JSON.stringify({ user: { id: 'u' } }));
    expect(await readStoredSession()).toBeNull();
    secureGetItem.mockResolvedValue(JSON.stringify({ access_token: 'jwt', user: {} }));
    expect(await readStoredSession()).toBeNull();
  });

  it('returns null when the storage read throws (never propagates)', async () => {
    secureGetItem.mockRejectedValue(new Error('keychain unavailable'));
    expect(await readStoredSession()).toBeNull();
  });
});

describe('cacheUserProfile / readCachedUserProfile', () => {
  const user = {
    id: 'user-1',
    email: 'x@y.z',
    first_name: 'გიო',
    last_name: 'ხ',
    created_at: '2026-01-01T00:00:00Z',
    tc_accepted_version: '1.0',
    tc_accepted_at: '2026-01-01T00:00:00Z',
    saved_signature_url: 'expert/user-1.png',
  } as AppUser;

  it('round-trips a profile keyed per user id', async () => {
    await cacheUserProfile(user);
    expect(store.has('@profile:user-1')).toBe(true);
    const back = await readCachedUserProfile('user-1');
    expect(back).toEqual(user);
  });

  it('returns null for a different user id (no cross-account leak)', async () => {
    await cacheUserProfile(user);
    expect(await readCachedUserProfile('user-2')).toBeNull();
  });

  it('returns null when the cached JSON is corrupt or id-mismatched', async () => {
    store.set('@profile:user-1', '{broken');
    expect(await readCachedUserProfile('user-1')).toBeNull();
    store.set('@profile:user-1', JSON.stringify({ ...user, id: 'someone-else' }));
    expect(await readCachedUserProfile('user-1')).toBeNull();
  });
});
