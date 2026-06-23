import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory backing stores for the mocked AsyncStorage + SecureStore. The
// migration branches on whether each store already has a value for the new
// key, and whether the old key is present, so each test starts clean.
const asyncStore: Record<string, string> = {};
const secureStore: Record<string, string> = {};

// Per-key throw injectors. The migration wraps each pair in its own try/catch,
// so we want to force a throw on a specific key and prove the *other* pairs
// still complete.
let asyncGetThrowKey: string | null = null;
let secureGetThrowKey: string | null = null;
// Write-side throw injectors: prove that if the copy-forward setItem fails, the
// catch is entered BEFORE removeItem, so the old key survives (no partial copy).
let asyncSetThrowKey: string | null = null;
let secureSetThrowKey: string | null = null;

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => {
      if (asyncGetThrowKey === k) throw new Error('AsyncStorage boom');
      return k in asyncStore ? asyncStore[k] : null;
    }),
    setItem: vi.fn(async (k: string, v: string) => {
      if (asyncSetThrowKey === k) throw new Error('AsyncStorage write boom');
      asyncStore[k] = v;
    }),
    removeItem: vi.fn(async (k: string) => {
      delete asyncStore[k];
    }),
  },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (k: string) => {
    if (secureGetThrowKey === k) throw new Error('SecureStore boom');
    return k in secureStore ? secureStore[k] : null;
  }),
  setItemAsync: vi.fn(async (k: string, v: string) => {
    if (secureSetThrowKey === k) throw new Error('SecureStore write boom');
    secureStore[k] = v;
  }),
  deleteItemAsync: vi.fn(async (k: string) => {
    delete secureStore[k];
  }),
}));

const { migrateLegacyStorage } = await import('../../lib/storageMigration');

// Canonical keys the module operates on (verbatim from the source).
const ASYNC_OLD = 'sarke.reminders.map';
const ASYNC_NEW = 'hubble.reminders.map';

const SECURE = [
  ['sarke.google.accessToken', 'hubble.google.accessToken'],
  ['sarke.google.refreshToken', 'hubble.google.refreshToken'],
  ['sarke.google.expiresAt', 'hubble.google.expiresAt'],
] as const;

beforeEach(() => {
  for (const k of Object.keys(asyncStore)) delete asyncStore[k];
  for (const k of Object.keys(secureStore)) delete secureStore[k];
  asyncGetThrowKey = null;
  secureGetThrowKey = null;
  asyncSetThrowKey = null;
  secureSetThrowKey = null;
  vi.clearAllMocks();
});

describe('migrateLegacyStorage — AsyncStorage reminders pair', () => {
  it('copies old → new when new is absent and old present, then removes old', async () => {
    asyncStore[ASYNC_OLD] = '{"a":1}';

    await migrateLegacyStorage();

    expect(asyncStore[ASYNC_NEW]).toBe('{"a":1}');
    expect(asyncStore[ASYNC_OLD]).toBeUndefined();
  });

  it('does NOT overwrite an existing new key but still removes the old key (idempotent)', async () => {
    asyncStore[ASYNC_NEW] = 'KEEP-ME';
    asyncStore[ASYNC_OLD] = 'STALE';

    await migrateLegacyStorage();

    expect(asyncStore[ASYNC_NEW]).toBe('KEEP-ME');
    expect(asyncStore[ASYNC_OLD]).toBeUndefined();
  });

  it('is a no-op for the value when old key is absent (new still untouched)', async () => {
    // Neither key present.
    await migrateLegacyStorage();

    expect(asyncStore[ASYNC_NEW]).toBeUndefined();
    expect(asyncStore[ASYNC_OLD]).toBeUndefined();
  });

  it('leaves a pre-existing new key intact when old key is absent', async () => {
    asyncStore[ASYNC_NEW] = 'EXISTING';

    await migrateLegacyStorage();

    expect(asyncStore[ASYNC_NEW]).toBe('EXISTING');
  });

  it('does NOT copy when new is absent but old is also absent — no new key created', async () => {
    // Drives the `value != null` false branch: getItem(old) returns null so no setItem.
    await migrateLegacyStorage();
    expect(ASYNC_NEW in asyncStore).toBe(false);
  });

  it('still removes the old key even when value copied was an empty string', async () => {
    // Empty string is != null, so it should be copied forward.
    asyncStore[ASYNC_OLD] = '';

    await migrateLegacyStorage();

    expect(asyncStore[ASYNC_NEW]).toBe('');
    expect(asyncStore[ASYNC_OLD]).toBeUndefined();
  });

  it('running twice is stable — second run leaves migrated value untouched', async () => {
    asyncStore[ASYNC_OLD] = 'v1';

    await migrateLegacyStorage();
    expect(asyncStore[ASYNC_NEW]).toBe('v1');

    await migrateLegacyStorage();
    expect(asyncStore[ASYNC_NEW]).toBe('v1');
    expect(asyncStore[ASYNC_OLD]).toBeUndefined();
  });

  it('swallows a throw during the AsyncStorage pair (best-effort)', async () => {
    asyncGetThrowKey = ASYNC_NEW; // getItem(newKey) throws inside the try

    await expect(migrateLegacyStorage()).resolves.toBeUndefined();
  });

  it('leaves the old key behind when the copy-forward setItem throws (no partial copy)', async () => {
    // The copy `setItem(newKey, value)` runs BEFORE `removeItem(oldKey)` in the
    // same try. A write failure jumps to catch, so removal is skipped and the
    // legacy value survives for the next cold-start retry — the one case where
    // the "always removes old" invariant intentionally does not hold.
    asyncStore[ASYNC_OLD] = 'precious';
    asyncSetThrowKey = ASYNC_NEW;

    await expect(migrateLegacyStorage()).resolves.toBeUndefined();

    expect(asyncStore[ASYNC_OLD]).toBe('precious'); // not removed
    expect(ASYNC_NEW in asyncStore).toBe(false); // copy never landed
  });

  it('an AsyncStorage throw does not abort the SecureStore pairs', async () => {
    asyncGetThrowKey = ASYNC_NEW; // async pair throws and is swallowed
    secureStore[SECURE[0][0]] = 'tok-access';

    await migrateLegacyStorage();

    // SecureStore migration still completed despite the async-pair throw.
    expect(secureStore[SECURE[0][1]]).toBe('tok-access');
    expect(secureStore[SECURE[0][0]]).toBeUndefined();
  });
});

describe('migrateLegacyStorage — SecureStore google token pairs', () => {
  it('copies each old token → new and removes old when new absent', async () => {
    secureStore[SECURE[0][0]] = 'access-1';
    secureStore[SECURE[1][0]] = 'refresh-1';
    secureStore[SECURE[2][0]] = '1700000000';

    await migrateLegacyStorage();

    for (const [oldKey, newKey] of SECURE) {
      expect(secureStore[oldKey]).toBeUndefined();
    }
    expect(secureStore[SECURE[0][1]]).toBe('access-1');
    expect(secureStore[SECURE[1][1]]).toBe('refresh-1');
    expect(secureStore[SECURE[2][1]]).toBe('1700000000');
  });

  it('does NOT overwrite an existing new token but still removes the old (idempotent)', async () => {
    secureStore[SECURE[0][1]] = 'KEEP-access';
    secureStore[SECURE[0][0]] = 'STALE-access';

    await migrateLegacyStorage();

    expect(secureStore[SECURE[0][1]]).toBe('KEEP-access');
    expect(secureStore[SECURE[0][0]]).toBeUndefined();
  });

  it('is a no-op when no old tokens are present', async () => {
    await migrateLegacyStorage();

    for (const [oldKey, newKey] of SECURE) {
      expect(oldKey in secureStore).toBe(false);
      expect(newKey in secureStore).toBe(false);
    }
  });

  it('migrates only the pairs that have an old value; leaves others empty', async () => {
    // Only the refresh token has a legacy value.
    secureStore[SECURE[1][0]] = 'refresh-only';

    await migrateLegacyStorage();

    expect(secureStore[SECURE[1][1]]).toBe('refresh-only');
    expect(secureStore[SECURE[1][0]]).toBeUndefined();
    // Untouched pairs got no new key.
    expect(SECURE[0][1] in secureStore).toBe(false);
    expect(SECURE[2][1] in secureStore).toBe(false);
  });

  it('a throw in one secure pair does not abort the remaining secure pairs', async () => {
    // Force the FIRST secure pair to throw; pairs 2 and 3 must still migrate.
    secureGetThrowKey = SECURE[0][1]; // getItemAsync(newKey) throws for pair 0
    secureStore[SECURE[0][0]] = 'access-x';
    secureStore[SECURE[1][0]] = 'refresh-x';
    secureStore[SECURE[2][0]] = 'expires-x';

    await migrateLegacyStorage();

    // Pair 0 threw before copy/remove: old key survives, new not written.
    expect(secureStore[SECURE[0][0]]).toBe('access-x');
    expect(SECURE[0][1] in secureStore).toBe(false);

    // Pairs 1 and 2 completed normally.
    expect(secureStore[SECURE[1][1]]).toBe('refresh-x');
    expect(secureStore[SECURE[1][0]]).toBeUndefined();
    expect(secureStore[SECURE[2][1]]).toBe('expires-x');
    expect(secureStore[SECURE[2][0]]).toBeUndefined();
  });

  it('a throw in a middle secure pair still lets the last pair migrate', async () => {
    secureGetThrowKey = SECURE[1][1]; // pair 1 throws
    secureStore[SECURE[2][0]] = 'expires-y';

    await migrateLegacyStorage();

    expect(secureStore[SECURE[2][1]]).toBe('expires-y');
    expect(secureStore[SECURE[2][0]]).toBeUndefined();
  });

  it('resolves to undefined and never rejects even when secure reads throw', async () => {
    secureGetThrowKey = SECURE[0][1];
    await expect(migrateLegacyStorage()).resolves.toBeUndefined();
  });

  it('leaves the old secure token behind when the copy-forward setItemAsync throws', async () => {
    // Same partial-copy guard for SecureStore: setItemAsync(newKey) before
    // deleteItemAsync(oldKey); a write throw must leave the old token intact.
    secureStore[SECURE[0][0]] = 'precious-access';
    secureSetThrowKey = SECURE[0][1];

    await expect(migrateLegacyStorage()).resolves.toBeUndefined();

    expect(secureStore[SECURE[0][0]]).toBe('precious-access'); // not deleted
    expect(SECURE[0][1] in secureStore).toBe(false); // copy never landed
  });

  it('running twice is stable — second run is a clean no-op', async () => {
    secureStore[SECURE[0][0]] = 'access-2';

    await migrateLegacyStorage();
    expect(secureStore[SECURE[0][1]]).toBe('access-2');

    await migrateLegacyStorage();
    expect(secureStore[SECURE[0][1]]).toBe('access-2');
    expect(SECURE[0][0] in secureStore).toBe(false);
  });
});

describe('migrateLegacyStorage — combined / call-shape', () => {
  it('migrates the async pair and all secure pairs together in one run', async () => {
    asyncStore[ASYNC_OLD] = 'reminders';
    secureStore[SECURE[0][0]] = 'a';
    secureStore[SECURE[1][0]] = 'r';
    secureStore[SECURE[2][0]] = 'e';

    await migrateLegacyStorage();

    expect(asyncStore[ASYNC_NEW]).toBe('reminders');
    expect(asyncStore[ASYNC_OLD]).toBeUndefined();
    expect(secureStore[SECURE[0][1]]).toBe('a');
    expect(secureStore[SECURE[1][1]]).toBe('r');
    expect(secureStore[SECURE[2][1]]).toBe('e');
    for (const [oldKey] of SECURE) expect(oldKey in secureStore).toBe(false);
  });

  it('always attempts removeItem on the async old key (even when nothing to copy)', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage'))
      .default;

    await migrateLegacyStorage();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(ASYNC_OLD);
  });

  it('always attempts deleteItemAsync on each secure old key (even when nothing to copy)', async () => {
    const SecureStore = await import('expo-secure-store');

    await migrateLegacyStorage();

    for (const [oldKey] of SECURE) {
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(oldKey);
    }
  });

  it('returns a Promise<void> that resolves to undefined on the clean happy path', async () => {
    await expect(migrateLegacyStorage()).resolves.toBeUndefined();
  });
});
