/**
 * Unit tests for the flow-start read primitive (lib/cachedRead.ts): online it
 * must always fetch fresh (staleTime 0) and populate the query cache; offline
 * it must resolve from cache immediately or throw OfflineDataMissingError —
 * never hang on a paused fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onlineManager } from '@tanstack/react-query';

vi.mock('../../lib/queryClient', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: 0, gcTime: Infinity } },
    }),
  };
});

// cachedRead consults the outbox queue (pending-create guard) — mock the RN
// modules its storage layer pulls in.
vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: vi.fn(async (k: string) => store.get(k) ?? null),
      setItem: vi.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
    },
  };
});
vi.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-test' }));
vi.mock('../../lib/logError', () => ({ logError: vi.fn() }));

import { queryClient } from '../../lib/queryClient';
import { cachedRead, OfflineDataMissingError } from '../../lib/cachedRead';

const KEY = ['projects', 'detail', 'p-1'] as const;

beforeEach(() => {
  queryClient.clear();
  onlineManager.setOnline(true);
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('cachedRead — online', () => {
  it('fetches, returns the value, and stores it in the cache', async () => {
    const fn = vi.fn(async () => ({ id: 'p-1', name: 'site' }));
    const result = await cachedRead(KEY, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'p-1', name: 'site' });
    expect(queryClient.getQueryData(KEY)).toEqual({ id: 'p-1', name: 'site' });
  });

  it('always fetches fresh (staleTime 0) instead of serving a cached value', async () => {
    queryClient.setQueryData(KEY, { id: 'p-1', name: 'stale' });
    const fn = vi.fn(async () => ({ id: 'p-1', name: 'fresh' }));
    const result = await cachedRead(KEY, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'p-1', name: 'fresh' });
  });

  it('propagates a fetch failure (same as the direct call it replaces)', async () => {
    const fn = vi.fn(async () => {
      throw new Error('boom');
    });
    await expect(cachedRead(KEY, fn)).rejects.toThrow('boom');
  });
});

describe('cachedRead — offline', () => {
  it('returns the cached value without calling the fetcher', async () => {
    queryClient.setQueryData(KEY, { id: 'p-1', name: 'cached' });
    onlineManager.setOnline(false);
    const fn = vi.fn(async () => ({ id: 'p-1', name: 'network' }));
    const result = await cachedRead(KEY, fn);
    expect(fn).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'p-1', name: 'cached' });
  });

  it('returns a cached null (a settled "not found") rather than throwing', async () => {
    queryClient.setQueryData(KEY, null);
    onlineManager.setOnline(false);
    const result = await cachedRead(KEY, async () => ({ id: 'x' }));
    expect(result).toBeNull();
  });

  it('throws OfflineDataMissingError when nothing is cached — never hangs', async () => {
    onlineManager.setOnline(false);
    const fn = vi.fn(async () => 'unreachable');
    await expect(cachedRead(KEY, fn)).rejects.toBeInstanceOf(OfflineDataMissingError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('tags the error message with "offline" so friendlyError maps it', async () => {
    onlineManager.setOnline(false);
    await expect(cachedRead(KEY, async () => 1)).rejects.toThrow(/offline/);
  });
});
