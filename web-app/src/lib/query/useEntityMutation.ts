/**
 * Standardized mutation hook.
 *
 * Before this, ~75 inline `useMutation` callsites each hand-wired their
 * `onSuccess` to a tangle of cache invalidation + toast + navigate + local
 * state, with three different error-surfacing styles. `useEntityMutation`
 * centralizes the contract:
 *   - invalidate a declared list of query keys (always factory keys),
 *   - optionally show a success toast,
 *   - run an `onDone` side effect (navigate, close modal, …),
 *   - surface errors via toast by default.
 *
 * Side effects stay at the callsite (in `onDone`) but the cache/toast plumbing
 * is uniform and declarative.
 */
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errors';

export type QueryKey = readonly unknown[];

export interface EntityMutationOptions<TArgs, TData> {
  mutationFn: (args: TArgs) => Promise<TData>;
  /** Query keys to invalidate on success. May depend on args/result. */
  invalidate?: QueryKey[] | ((args: TArgs, data: TData) => QueryKey[]);
  /** Success toast text, or a builder, or omit for none. */
  successToast?: string | ((data: TData, args: TArgs) => string);
  /** Side effect after success + invalidation (navigate, close, …). */
  onDone?: (data: TData, args: TArgs) => void;
  /** Show an error toast on failure. Default true. */
  errorToast?: boolean;
  /** Extra error handling (logging, banner state, …). */
  onFail?: (error: unknown, args: TArgs) => void;
}

/** Raw message extractor (no translation). Prefer `humanizeError` for user-facing copy. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useEntityMutation<TArgs = void, TData = unknown>(
  options: EntityMutationOptions<TArgs, TData>,
): UseMutationResult<TData, unknown, TArgs> {
  const qc = useQueryClient();
  const { mutationFn, invalidate, successToast, onDone, errorToast = true, onFail } = options;

  return useMutation<TData, unknown, TArgs>({
    mutationFn,
    onSuccess: (data, args) => {
      const keys =
        typeof invalidate === 'function' ? invalidate(args, data) : (invalidate ?? []);
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: key });
      }
      if (successToast) {
        toast.success(typeof successToast === 'function' ? successToast(data, args) : successToast);
      }
      onDone?.(data, args);
    },
    onError: (error, args) => {
      // Always log the raw error for developers; show humanized copy to users.
      console.error(error);
      if (errorToast) toast.error(humanizeError(error));
      onFail?.(error, args);
    },
  });
}
