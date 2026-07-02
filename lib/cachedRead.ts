import { onlineManager } from '@tanstack/react-query';
import { queryClient } from './queryClient';

/**
 * Thrown by `cachedRead` when the device is offline and the persisted query
 * cache has nothing for the key. The message deliberately contains "offline"
 * so `friendlyError()` (lib/errorMap.ts) maps it to the localized
 * check-your-connection copy without extra wiring at every call site.
 */
export class OfflineDataMissingError extends Error {
  readonly queryKey: readonly unknown[];

  constructor(queryKey: readonly unknown[]) {
    super(`offline: no cached data for ${JSON.stringify(queryKey)}`);
    this.name = 'OfflineDataMissingError';
    this.queryKey = queryKey;
  }
}

/**
 * Flow-start read through the React Query cache — THE way to load data a flow
 * needs before it can render (project header/autofill, template + question
 * set, edit-mode hydration). Don't call `*.getById()` directly at flow start.
 *
 * Online: always fetches fresh (`staleTime: 0`, deduped against an in-flight
 * fetch of the same key — identical behavior to the direct call it replaces)
 * and stores the result in the query cache, which the AsyncStorage persister
 * carries across launches — every successful read doubles as offline warm-up.
 *
 * Offline: returns the cached value immediately (a paused fetch would hang
 * forever) or throws `OfflineDataMissingError`.
 */
export async function cachedRead<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
): Promise<T> {
  if (onlineManager.isOnline()) {
    return queryClient.fetchQuery({ queryKey, queryFn, staleTime: 0 });
  }
  const cached = queryClient.getQueryData<T>(queryKey);
  if (cached !== undefined) return cached;
  throw new OfflineDataMissingError(queryKey);
}
