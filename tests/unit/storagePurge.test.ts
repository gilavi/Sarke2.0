import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory backing store for the mocked AsyncStorage. `purgeUserScopedStorage`
// only touches getAllKeys + multiRemove, so we model the key list as an array
// and let multiRemove splice matching keys out of it.
let keys: string[] = [];
let getAllKeysThrows = false;

const getAllKeys = vi.fn(async () => {
  if (getAllKeysThrows) throw new Error('AsyncStorage unavailable');
  return [...keys];
});
const multiRemove = vi.fn(async (toRemove: string[]) => {
  keys = keys.filter((k) => !toRemove.includes(k));
});

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getAllKeys,
    multiRemove,
  },
}));

const { purgeUserScopedStorage } = await import('../../lib/storage-purge');

/** Last array argument passed to multiRemove, as a Set for order-independent compare. */
function removedSet(): Set<string> {
  const lastCall = multiRemove.mock.calls.at(-1);
  return new Set(lastCall ? lastCall[0] : []);
}

beforeEach(() => {
  keys = [];
  getAllKeysThrows = false;
  vi.clearAllMocks();
});

describe('purgeUserScopedStorage — prefix START-WITH matches', () => {
  it('removes wizard: prefixed keys', async () => {
    keys = ['wizard:foo', 'wizard:bar:baz'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(new Set(['wizard:foo', 'wizard:bar:baz']));
  });

  it('removes bobcat-wizard:, excavator-wizard:, ge-wizard: prefixed keys', async () => {
    keys = ['bobcat-wizard:1', 'excavator-wizard:7', 'ge-wizard:abc'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(
      new Set(['bobcat-wizard:1', 'excavator-wizard:7', 'ge-wizard:abc']),
    );
  });

  it('removes @offline: prefixed keys', async () => {
    keys = ['@offline:x', '@offline:queue:42'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(new Set(['@offline:x', '@offline:queue:42']));
  });

  it('removes home_cache_ and regulation_seen_ user-scoped keys', async () => {
    keys = ['home_cache_u1', 'regulation_seen_u1'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(new Set(['home_cache_u1', 'regulation_seen_u1']));
  });

  it('removes regulation_date_ prefixed keys', async () => {
    keys = ['regulation_date_2026'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(new Set(['regulation_date_2026']));
  });
});

describe('purgeUserScopedStorage — EXACT matches', () => {
  it('removes the bare pending-signatures key', async () => {
    keys = ['pending-signatures'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(new Set(['pending-signatures']));
  });

  it('removes the bare pending-pdf-uploads key', async () => {
    keys = ['pending-pdf-uploads'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(new Set(['pending-pdf-uploads']));
  });

  it('removes regulations_last_fetch (exact)', async () => {
    keys = ['regulations_last_fetch'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(new Set(['regulations_last_fetch']));
  });

  it('removes projects_view_pref (exact)', async () => {
    keys = ['projects_view_pref'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(new Set(['projects_view_pref']));
  });

  it('removes theme_dark and pdf_language (exact)', async () => {
    keys = ['theme_dark', 'pdf_language'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(new Set(['theme_dark', 'pdf_language']));
  });

  it('also removes startsWith variants of the "exact-feeling" prefixes (they are prefixes too)', async () => {
    // The matcher is `k === p || k.startsWith(p)` for EVERY entry, so a key that
    // merely starts with 'pending-signatures' / 'theme_dark' is also purged.
    keys = ['pending-signatures-extra', 'theme_dark_v2', 'pdf_language_pref'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(
      new Set(['pending-signatures-extra', 'theme_dark_v2', 'pdf_language_pref']),
    );
  });
});

describe('purgeUserScopedStorage — leaves unrelated keys intact', () => {
  it('does NOT remove the supabase auth token or random keys', async () => {
    keys = ['sb-auth-token', 'random'];
    await purgeUserScopedStorage();
    // Nothing matched → multiRemove never called.
    expect(multiRemove).not.toHaveBeenCalled();
    // And the store is untouched.
    expect(keys).toEqual(['sb-auth-token', 'random']);
  });

  it('only removes the scoped subset and leaves the rest', async () => {
    keys = [
      'wizard:draft',
      'sb-auth-token',
      'home_cache_u9',
      'random',
      'some-other-cache',
      'pdf_language',
    ];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(
      new Set(['wizard:draft', 'home_cache_u9', 'pdf_language']),
    );
    // Survivors remain in the store after multiRemove.
    expect(keys.sort()).toEqual(
      ['random', 'sb-auth-token', 'some-other-cache'].sort(),
    );
  });

  it('does not match keys that contain but do not start with a prefix', async () => {
    // 'x-wizard:foo' contains 'wizard:' but does not START WITH it → kept.
    keys = ['x-wizard:foo', 'my-home_cache_u1', 'not-theme_dark'];
    await purgeUserScopedStorage();
    expect(multiRemove).not.toHaveBeenCalled();
    expect(keys).toEqual(['x-wizard:foo', 'my-home_cache_u1', 'not-theme_dark']);
  });
});

describe('purgeUserScopedStorage — empty / no-match behavior', () => {
  it('does not call multiRemove when there are no keys at all', async () => {
    keys = [];
    await purgeUserScopedStorage();
    expect(getAllKeys).toHaveBeenCalledTimes(1);
    expect(multiRemove).not.toHaveBeenCalled();
  });

  it('does not call multiRemove when no key matches any prefix', async () => {
    keys = ['foo', 'bar', 'baz-qux'];
    await purgeUserScopedStorage();
    expect(multiRemove).not.toHaveBeenCalled();
  });

  it('calls multiRemove exactly once with all matches in a single batch', async () => {
    keys = ['wizard:a', 'wizard:b', 'pending-signatures', 'unrelated'];
    await purgeUserScopedStorage();
    expect(multiRemove).toHaveBeenCalledTimes(1);
    expect(removedSet()).toEqual(
      new Set(['wizard:a', 'wizard:b', 'pending-signatures']),
    );
  });
});

describe('purgeUserScopedStorage — never throws', () => {
  it('swallows errors when getAllKeys throws and never calls multiRemove', async () => {
    getAllKeysThrows = true;
    await expect(purgeUserScopedStorage()).resolves.toBeUndefined();
    expect(multiRemove).not.toHaveBeenCalled();
  });

  it('swallows errors when multiRemove rejects', async () => {
    keys = ['wizard:foo'];
    multiRemove.mockRejectedValueOnce(new Error('multiRemove failed'));
    await expect(purgeUserScopedStorage()).resolves.toBeUndefined();
    expect(multiRemove).toHaveBeenCalledTimes(1);
  });

  it('resolves to undefined on the happy path', async () => {
    keys = ['wizard:foo'];
    const result = await purgeUserScopedStorage();
    expect(result).toBeUndefined();
  });
});

describe('purgeUserScopedStorage — ordering independence', () => {
  it('produces the same removal set regardless of key order', async () => {
    keys = ['pdf_language', 'random', 'wizard:z', 'sb-auth-token', 'home_cache_u1'];
    await purgeUserScopedStorage();
    expect(removedSet()).toEqual(
      new Set(['pdf_language', 'wizard:z', 'home_cache_u1']),
    );
  });
});
