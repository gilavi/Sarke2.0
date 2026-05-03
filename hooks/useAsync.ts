import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  retry: () => void;
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

/**
 * Runs an async fetcher when `deps` change. Exposes `{data, loading, error, retry}`.
 * - `loading`: true only on the very first fetch (no cached data yet).
 * - `refreshing`: true when a retry or dependency-change refetch runs with cached data present.
 * - Keeps the last successful value on error (caller can show it alongside an error banner).
 * - Ignores stale results if deps change mid-flight.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: React.DependencyList): AsyncState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const runIdRef = useRef(0);
  const hasDataRef = useRef(false);

  useEffect(() => {
    const runId = ++runIdRef.current;
    const hasData = hasDataRef.current;
    if (hasData) setRefreshing(true);
    else setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then(result => {
        if (runIdRef.current !== runId) return;
        setDataState(result);
        hasDataRef.current = true;
        setError(null);
      })
      .catch((err: unknown) => {
        if (runIdRef.current !== runId) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (runIdRef.current !== runId) return;
        setLoading(false);
        setRefreshing(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const retry = useCallback(() => {
    setNonce(n => n + 1);
  }, []);

  const setData = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setDataState(prev => {
      const next = typeof updater === 'function' ? (updater as (p: T | undefined) => T)(prev) : updater;
      hasDataRef.current = true;
      return next;
    });
  }, []);

  return { data, loading, refreshing, error, retry, setData };
}
