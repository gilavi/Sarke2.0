// Canonical three-state-plus-offline guard for list screens.
//
// The old inline recipe — `(q.isFetching || !q.isFetched) && data.length === 0`
// — predates onlineManager wiring. With onlineManager bound (lib/queryClient.ts),
// an offline query with NO cached data sits at fetchStatus 'paused' with
// isFetching=false and isFetched=false, which the old guard reads as
// "loading" forever: an infinite skeleton. This hook adds the missing state.
//
// Semantics:
// - 'data'     — there are rows to render (cached or fresh).
// - 'skeleton' — a fetch has produced no answer yet (first fetch, or a
//                background refetch replacing a stale empty result).
// - 'offline'  — the query is paused (no network) and nothing is cached.
//                Render <OfflineEmptyState /> — NOT the regular empty state
//                (the data may well exist server-side).
// - 'empty'    — the query settled with a confirmed empty result.

/** Load state for a list screen. See file header for semantics. */
export type ListLoadState = 'data' | 'skeleton' | 'offline' | 'empty';

/** The subset of UseQueryResult the guard needs (structural, so tests can pass plain objects). */
export interface LoadStateQuery {
  isFetching: boolean;
  isFetched: boolean;
  fetchStatus: 'fetching' | 'paused' | 'idle';
}

/**
 * Pure single-query guard. `count` is the number of rows the screen would
 * render (e.g. `data?.length ?? 0`, or a post-filter count).
 */
export function listLoadState(q: LoadStateQuery, count: number): ListLoadState {
  if (count > 0) return 'data';
  if (q.isFetching || (!q.isFetched && q.fetchStatus !== 'paused')) return 'skeleton';
  if (q.fetchStatus === 'paused' && !q.isFetched) return 'offline';
  return 'empty';
}

/**
 * Combined guard for screens that merge several queries into one list
 * (e.g. drafts across record types). Skeleton while ANY query is still
 * producing its first answer; offline when the only reason the list is empty
 * is a paused, never-fetched query.
 */
export function listsLoadState(queries: LoadStateQuery[], count: number): ListLoadState {
  if (count > 0) return 'data';
  if (queries.some((q) => q.isFetching || (!q.isFetched && q.fetchStatus !== 'paused'))) {
    return 'skeleton';
  }
  if (queries.some((q) => q.fetchStatus === 'paused' && !q.isFetched)) return 'offline';
  return 'empty';
}

/** Hook-shaped alias of listLoadState for component call sites. */
export function useListLoadState(q: LoadStateQuery, count: number): ListLoadState {
  return listLoadState(q, count);
}

/**
 * Flow-entry settle gate: true once the query has produced an answer the flow
 * can act on. Gating on `isFetched` alone hangs offline — a paused
 * never-fetched query (cold cache, no network) never becomes fetched — so
 * 'paused' counts as settled-with-no-data: the flow renders its picker/offline
 * state instead of a permanently blank screen. React Query resumes paused
 * fetches on reconnect, so consumers refresh by themselves once back online.
 * Consumers: components/FlowProjectPicker.tsx, app/inspections/new.tsx.
 */
export function querySettled(q: Pick<LoadStateQuery, 'isFetched' | 'fetchStatus'>): boolean {
  return q.isFetched || q.fetchStatus === 'paused';
}
