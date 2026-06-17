import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory backing stores for the mocked SecureStore + AsyncStorage. The
// adapter does branching on whether each one has a value for a given key, so
// each test starts from a clean slate.
const secureStore: Record<string, string> = {};
const asyncStore: Record<string, string> = {};

let secureGetThrows = false;
let secureSetThrows = false;

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (k: string) => {
    if (secureGetThrows) throw new Error('SecureStore unavailable');
    return k in secureStore ? secureStore[k] : null;
  }),
  setItemAsync: vi.fn(async (k: string, v: string) => {
    if (secureSetThrows) throw new Error('SecureStore unavailable');
    secureStore[k] = v;
  }),
  deleteItemAsync: vi.fn(async (k: string) => {
    delete secureStore[k];
  }),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => (k in asyncStore ? asyncStore[k] : null)),
    setItem: vi.fn(async (k: string, v: string) => {
      asyncStore[k] = v;
    }),
    removeItem: vi.fn(async (k: string) => {
      delete asyncStore[k];
    }),
  },
}));

const { secureSessionStorage } = await import('../../lib/secureSessionStorage');

const KEY = 'sb-test-auth-token';
// Adapter chunks at 1800 chars; pick sizes that exercise both branches.
const SHORT = 'small-value';
const LONG = 'A'.repeat(5_000); // → 3 chunks (1800 + 1800 + 1400)

beforeEach(() => {
  for (const k of Object.keys(secureStore)) delete secureStore[k];
  for (const k of Object.keys(asyncStore)) delete asyncStore[k];
  secureGetThrows = false;
  secureSetThrows = false;
});

describe('secureSessionStorage.setItem', () => {
  it('writes short values as a single SecureStore key', async () => {
    await secureSessionStorage.setItem(KEY, SHORT);
    expect(secureStore[KEY]).toBe(SHORT);
    expect(secureStore[`${KEY}__count`]).toBeUndefined();
    expect(secureStore[`${KEY}__0`]).toBeUndefined();
  });

  it('chunks long values into N keys + a __count companion', async () => {
    await secureSessionStorage.setItem(KEY, LONG);
    // Single-key variant must not be set when chunking
    expect(secureStore[KEY]).toBeUndefined();
    expect(secureStore[`${KEY}__count`]).toBe('3');
    expect(secureStore[`${KEY}__0`]?.length).toBe(1800);
    expect(secureStore[`${KEY}__1`]?.length).toBe(1800);
    expect(secureStore[`${KEY}__2`]?.length).toBe(1400);
    // Concatenated parts equal the original
    expect(
      secureStore[`${KEY}__0`] + secureStore[`${KEY}__1`] + secureStore[`${KEY}__2`],
    ).toBe(LONG);
  });

  it('clears prior single-key value when re-writing as chunked', async () => {
    secureStore[KEY] = 'stale';
    await secureSessionStorage.setItem(KEY, LONG);
    expect(secureStore[KEY]).toBeUndefined();
    expect(secureStore[`${KEY}__count`]).toBe('3');
  });

  it('clears prior chunked value when re-writing as single', async () => {
    secureStore[`${KEY}__count`] = '2';
    secureStore[`${KEY}__0`] = 'old0';
    secureStore[`${KEY}__1`] = 'old1';
    await secureSessionStorage.setItem(KEY, SHORT);
    expect(secureStore[KEY]).toBe(SHORT);
    expect(secureStore[`${KEY}__count`]).toBeUndefined();
    expect(secureStore[`${KEY}__0`]).toBeUndefined();
    expect(secureStore[`${KEY}__1`]).toBeUndefined();
  });

  it('falls back to AsyncStorage when SecureStore throws on write', async () => {
    secureSetThrows = true;
    await secureSessionStorage.setItem(KEY, SHORT);
    expect(asyncStore[KEY]).toBe(SHORT);
  });
});

describe('secureSessionStorage.getItem', () => {
  it('returns the single-key SecureStore value when present', async () => {
    secureStore[KEY] = SHORT;
    expect(await secureSessionStorage.getItem(KEY)).toBe(SHORT);
  });

  it('reassembles chunked SecureStore values via the __count key', async () => {
    await secureSessionStorage.setItem(KEY, LONG);
    expect(await secureSessionStorage.getItem(KEY)).toBe(LONG);
  });

  it('returns null when nothing is stored anywhere', async () => {
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('returns null when __count is set but a chunk is missing', async () => {
    secureStore[`${KEY}__count`] = '3';
    secureStore[`${KEY}__0`] = 'a';
    // __1 / __2 deliberately missing
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('returns null when __count is non-numeric', async () => {
    secureStore[`${KEY}__count`] = 'NaN';
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('migrates a prior AsyncStorage-persisted session into SecureStore on first read', async () => {
    asyncStore[KEY] = SHORT;
    // SecureStore is empty
    expect(secureStore[KEY]).toBeUndefined();

    const value = await secureSessionStorage.getItem(KEY);
    expect(value).toBe(SHORT);

    // After read: SecureStore now has it, AsyncStorage is cleaned up
    expect(secureStore[KEY]).toBe(SHORT);
    expect(asyncStore[KEY]).toBeUndefined();
  });

  it('still returns the AsyncStorage value when SecureStore write fails during migration', async () => {
    asyncStore[KEY] = SHORT;
    secureSetThrows = true;

    const value = await secureSessionStorage.getItem(KEY);
    expect(value).toBe(SHORT);
    // AsyncStorage is left alone if we couldn't copy forward
    expect(asyncStore[KEY]).toBe(SHORT);
  });

  it('falls back to AsyncStorage migration path when SecureStore reads throw', async () => {
    secureGetThrows = true;
    asyncStore[KEY] = SHORT;

    const value = await secureSessionStorage.getItem(KEY);
    expect(value).toBe(SHORT);
  });
});

describe('secureSessionStorage.removeItem', () => {
  it('removes single-key SecureStore value AND AsyncStorage backup', async () => {
    secureStore[KEY] = SHORT;
    asyncStore[KEY] = SHORT;

    await secureSessionStorage.removeItem(KEY);

    expect(secureStore[KEY]).toBeUndefined();
    expect(asyncStore[KEY]).toBeUndefined();
  });

  it('removes chunked SecureStore value (every chunk + __count)', async () => {
    await secureSessionStorage.setItem(KEY, LONG);
    expect(secureStore[`${KEY}__count`]).toBe('3');

    await secureSessionStorage.removeItem(KEY);

    expect(secureStore[`${KEY}__count`]).toBeUndefined();
    expect(secureStore[`${KEY}__0`]).toBeUndefined();
    expect(secureStore[`${KEY}__1`]).toBeUndefined();
    expect(secureStore[`${KEY}__2`]).toBeUndefined();
  });
});

describe('secureSessionStorage key sanitization', () => {
  it('replaces illegal characters before hitting SecureStore', async () => {
    // SecureStore allows alphanumeric + . _ - only. Other chars get mapped to _
    const dirtyKey = 'sb:weird/key with spaces';
    await secureSessionStorage.setItem(dirtyKey, SHORT);
    // The sanitized key - not the original - is what landed in the store
    expect(secureStore['sb_weird_key_with_spaces']).toBe(SHORT);
    expect(secureStore[dirtyKey]).toBeUndefined();
    expect(await secureSessionStorage.getItem(dirtyKey)).toBe(SHORT);
  });
});
