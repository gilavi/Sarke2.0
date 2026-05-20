/**
 * One place for the loading -> error -> empty -> data state machine that was
 * previously hand-rolled in every list and detail page (the copy-pasted
 * `error instanceof Error ? error.message : String(error)` red banner, the
 * skeletons, the "ვერ მოიძებნა" empty state appeared ~86 times).
 *
 *   <AsyncBoundary query={q} variant="detail">
 *     {(data) => <Thing data={data} />}
 *   </AsyncBoundary>
 *
 * `children` only renders once data is present and non-empty, so it receives a
 * non-null value.
 */
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { SkeletonList, SkeletonDetailPage } from '@/components/SkeletonCard';

function defaultErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function ErrorView({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      {defaultErrorMessage(error)}
    </div>
  );
}

export function EmptyView({ message = 'ვერ მოიძებნა.' }: { message?: string }) {
  return <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>;
}

interface AsyncBoundaryProps<T> {
  query: Pick<UseQueryResult<T>, 'data' | 'isLoading' | 'isError' | 'error'>;
  children: (data: NonNullable<T>) => ReactNode;
  /** Default loading skeleton shape. */
  variant?: 'list' | 'detail';
  /** Override the loading node entirely. */
  loading?: ReactNode;
  /** Override the empty node, or pass a string for the empty message. */
  empty?: ReactNode | string;
  /** Treat a present value as empty (e.g. an empty array). */
  isEmpty?: (data: NonNullable<T>) => boolean;
}

export function AsyncBoundary<T>({
  query,
  children,
  variant = 'list',
  loading,
  empty,
  isEmpty,
}: AsyncBoundaryProps<T>) {
  if (query.isLoading) {
    return <>{loading ?? (variant === 'detail' ? <SkeletonDetailPage /> : <SkeletonList />)}</>;
  }
  if (query.isError) {
    return <ErrorView error={query.error} />;
  }
  const data = query.data;
  if (data == null || (isEmpty?.(data as NonNullable<T>) ?? false)) {
    if (typeof empty === 'string') return <EmptyView message={empty} />;
    return <>{empty ?? <EmptyView />}</>;
  }
  return <>{children(data as NonNullable<T>)}</>;
}
