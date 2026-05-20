/**
 * Thin wrapper over `useQuery` that requires a query key from the
 * `app/queryKeys.ts` factories (a `readonly unknown[]`), discouraging the
 * raw inline `['inspection', id]` literals that made cache invalidation
 * correctness accidental. Behaviour is otherwise identical to `useQuery`; this
 * is the single place to add cross-cutting query defaults later.
 */
import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';

export type QueryKey = readonly unknown[];

export interface EntityQueryOptions<TData>
  extends Omit<UseQueryOptions<TData, unknown, TData, QueryKey>, 'queryKey' | 'queryFn'> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
}

export function useEntityQuery<TData>(
  options: EntityQueryOptions<TData>,
): UseQueryResult<TData, unknown> {
  return useQuery<TData, unknown, TData, QueryKey>(options);
}
