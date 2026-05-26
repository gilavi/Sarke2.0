import { describe, it, expect, vi, beforeEach } from 'vitest';

const store: Record<string, string> = {};
const setItem = vi.fn(async (k: string, v: string) => {
  store[k] = v;
});

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem,
    removeItem: vi.fn(async (k: string) => {
      delete store[k];
    }),
  },
}));

const { saveLocalSignatures, loadLocalSignatures, removeLocalSignatures } =
  await import('../../lib/localSignatures');

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  setItem.mockClear();
});

describe('localSignatures', () => {
  it('round-trips an object via save → load', async () => {
    await saveLocalSignatures('insp-1', { name: 'Test', signature: 'data:...' });
    expect(await loadLocalSignatures('insp-1')).toEqual({
      name: 'Test',
      signature: 'data:...',
    });
  });

  it('returns null for an inspection with no stored signatures', async () => {
    expect(await loadLocalSignatures('nope')).toBeNull();
  });

  it('removes stored signatures for an inspection', async () => {
    await saveLocalSignatures('insp-1', { a: 1 });
    await removeLocalSignatures('insp-1');
    expect(await loadLocalSignatures('insp-1')).toBeNull();
  });

  it('uses the local-sigs: prefix for the storage key', async () => {
    await saveLocalSignatures('insp-42', { foo: 'bar' });
    expect(setItem).toHaveBeenCalledWith('local-sigs:insp-42', JSON.stringify({ foo: 'bar' }));
  });

  it('keeps each inspection isolated', async () => {
    await saveLocalSignatures('a', { v: 'A' });
    await saveLocalSignatures('b', { v: 'B' });
    expect(await loadLocalSignatures('a')).toEqual({ v: 'A' });
    expect(await loadLocalSignatures('b')).toEqual({ v: 'B' });
  });
});
