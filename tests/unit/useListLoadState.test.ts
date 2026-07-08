/**
 * Truth table for the canonical offline-aware list load-state guard.
 *
 * The critical case the old inline recipe got wrong: with onlineManager wired,
 * an offline query with NO cached data sits at fetchStatus 'paused' with
 * isFetching=false / isFetched=false — the inline guard read that as "loading"
 * forever (infinite skeleton). The hook must classify it as 'offline'.
 */
import { describe, it, expect } from 'vitest';
import {
  listLoadState,
  listsLoadState,
  querySettled,
  type LoadStateQuery,
} from '../../hooks/useListLoadState';

const q = (
  over: Partial<LoadStateQuery>,
): LoadStateQuery => ({
  isFetching: false,
  isFetched: false,
  fetchStatus: 'idle',
  ...over,
});

describe('listLoadState', () => {
  it('returns data whenever there are rows, regardless of fetch state', () => {
    expect(listLoadState(q({ isFetching: true }), 3)).toBe('data');
    expect(listLoadState(q({ fetchStatus: 'paused' }), 1)).toBe('data');
    expect(listLoadState(q({ isFetched: true }), 5)).toBe('data');
  });

  it('returns skeleton on the very first fetch (never fetched, fetching)', () => {
    expect(listLoadState(q({ isFetching: true, fetchStatus: 'fetching' }), 0)).toBe('skeleton');
  });

  it('returns skeleton before the first fetch even starts (idle, never fetched)', () => {
    expect(listLoadState(q({}), 0)).toBe('skeleton');
  });

  it('returns skeleton while a background refetch replaces a stale empty result', () => {
    expect(
      listLoadState(q({ isFetching: true, isFetched: true, fetchStatus: 'fetching' }), 0),
    ).toBe('skeleton');
  });

  it('returns offline for a paused, never-fetched query with no rows (NOT an infinite skeleton)', () => {
    expect(listLoadState(q({ fetchStatus: 'paused' }), 0)).toBe('offline');
  });

  it('returns empty (not offline) when a paused query has already fetched a real []', () => {
    expect(listLoadState(q({ isFetched: true, fetchStatus: 'paused' }), 0)).toBe('empty');
  });

  it('returns empty once the query settles with []', () => {
    expect(listLoadState(q({ isFetched: true }), 0)).toBe('empty');
  });
});

describe('listsLoadState', () => {
  it('returns data when the merged count is positive', () => {
    expect(listsLoadState([q({}), q({ fetchStatus: 'paused' })], 2)).toBe('data');
  });

  it('returns skeleton while ANY query is still producing its first answer', () => {
    expect(
      listsLoadState(
        [q({ isFetched: true }), q({ isFetching: true, fetchStatus: 'fetching' })],
        0,
      ),
    ).toBe('skeleton');
    // one paused-uncached + one never-started: the never-started one wins (skeleton)
    expect(listsLoadState([q({ fetchStatus: 'paused' }), q({})], 0)).toBe('skeleton');
  });

  it('returns offline when the only unsettled queries are paused-uncached', () => {
    expect(
      listsLoadState([q({ isFetched: true }), q({ fetchStatus: 'paused' })], 0),
    ).toBe('offline');
  });

  it('returns empty when every query settled with no rows', () => {
    expect(listsLoadState([q({ isFetched: true }), q({ isFetched: true })], 0)).toBe('empty');
  });

  it('handles the all-paused cold-offline boot (no cache at all)', () => {
    expect(
      listsLoadState(
        [q({ fetchStatus: 'paused' }), q({ fetchStatus: 'paused' })],
        0,
      ),
    ).toBe('offline');
  });
});

describe('querySettled', () => {
  // Flow-entry gate (app/inspections/new.tsx, FlowProjectPicker): the exact
  // hang the audit found was a seed effect gated on isFetched alone — a
  // paused never-fetched query (offline, cold cache) never becomes fetched,
  // so the screen stayed a blank View with no back affordance forever.
  it('settles once fetched, regardless of fetchStatus', () => {
    expect(querySettled(q({ isFetched: true }))).toBe(true);
    expect(querySettled(q({ isFetched: true, fetchStatus: 'fetching' }))).toBe(true);
    expect(querySettled(q({ isFetched: true, fetchStatus: 'paused' }))).toBe(true);
  });

  it('treats a paused never-fetched query as settled (offline cold cache must not hang)', () => {
    expect(querySettled(q({ fetchStatus: 'paused' }))).toBe(true);
  });

  it('does NOT settle while the first fetch is still producing an answer', () => {
    expect(querySettled(q({}))).toBe(false); // idle, never fetched
    expect(querySettled(q({ isFetching: true, fetchStatus: 'fetching' }))).toBe(false);
  });
});
