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
 *
 * When used WITHOUT a `query` prop, AsyncBoundary acts as a section-level
 * error isolation shell - it renders `children` directly and, if any child
 * throws during render, shows an inline ErrorView instead of propagating to
 * the nearest root error boundary.
 *
 *   <AsyncBoundary>
 *     <SomeSection />
 *   </AsyncBoundary>
 */
import { Component, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { SkeletonList, SkeletonDetailPage } from '@/components/SkeletonCard';
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError } from '@/lib/errors';

export function ErrorView({ error }: { error: unknown }) {
  return (
    <ErrorMessage>{humanizeError(error)}</ErrorMessage>
  );
}

export function EmptyView({ message = 'ვერ მოიძებნა.' }: { message?: string }) {
  return <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>;
}

/** Used when AsyncBoundary wraps a section with no query prop. */
interface SectionBoundaryProps {
  query?: undefined;
  children: ReactNode;
  variant?: never;
  loading?: never;
  empty?: never;
  isEmpty?: never;
}

interface QueryBoundaryProps<T> {
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

type AsyncBoundaryProps<T> = SectionBoundaryProps | QueryBoundaryProps<T>;

// ── Section-level error boundary class (no-query mode) ───────────────────────

interface SectionBoundaryState { hasError: boolean; error?: unknown }

class SectionErrorBoundary extends Component<{ children: ReactNode }, SectionBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): SectionBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) return <ErrorView error={this.state.error} />;
    return this.props.children;
  }
}

// ── Public export ─────────────────────────────────────────────────────────────

export function AsyncBoundary<T>(props: AsyncBoundaryProps<T>) {
  // No-query mode: act as a section-level error isolation shell.
  if (props.query === undefined) {
    return <SectionErrorBoundary>{props.children as ReactNode}</SectionErrorBoundary>;
  }

  const { query, children, variant = 'list', loading, empty, isEmpty } =
    props as QueryBoundaryProps<T>;

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
