/**
 * Test helper: a chainable mock of the Supabase PostgREST query builder.
 *
 * The data layer builds queries like
 *   supabase.from(t).select(c).order(o).limit(n).eq(col, v)        // awaited
 *   supabase.from(t).select(c).eq('id', id).maybeSingle()
 *   supabase.from(t).insert(row).select(c).single()
 *   supabase.from(t).update(row).eq('id', id)                       // awaited, { error }
 *   supabase.from(t).delete().eq('id', id)                          // awaited, { error }
 *
 * `makeBuilder(result)` returns an object where every chain method is a spy that
 * returns the same builder, `single()`/`maybeSingle()` resolve to `result`, and
 * the builder itself is thenable — so a chain that ends without a terminal
 * `single` (just awaited) also resolves to `result`. One builder == one query;
 * for functions that issue several queries, queue builders with
 * `from.mockReturnValueOnce(makeBuilder(a)).mockReturnValueOnce(makeBuilder(b))`.
 *
 * Methods are real spies, so tests can assert call args:
 *   const b = makeBuilder({ data: rows, error: null });
 *   (supabase.from as Mock).mockReturnValueOnce(b);
 *   await listProjects();
 *   expect(b.eq).toHaveBeenCalledWith('project_id', 'p1');
 */
import { vi, type Mock } from 'vitest';

export interface QueryResult<T = unknown> {
  data?: T;
  error?: { message: string } | null;
  count?: number | null;
}

const CHAIN_METHODS = [
  'select', 'insert', 'update', 'upsert', 'delete',
  'eq', 'neq', 'in', 'is', 'not', 'match', 'filter',
  'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'contains',
  'order', 'limit', 'range',
] as const;

export type ChainBuilder = Record<(typeof CHAIN_METHODS)[number], Mock> & {
  maybeSingle: Mock;
  single: Mock;
  then: (onFulfilled?: ((v: QueryResult) => unknown) | null, onRejected?: ((e: unknown) => unknown) | null) => Promise<unknown>;
};

export function makeBuilder<T = unknown>(
  result: QueryResult<T> = { data: null, error: null },
): ChainBuilder {
  const builder = {} as ChainBuilder & Record<string, unknown>;
  for (const m of CHAIN_METHODS) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(result as QueryResult).then(onFulfilled ?? undefined, onRejected ?? undefined);
  return builder;
}

/** Build a `supabase.storage.from(bucket)` mock with spyable methods. */
export function makeStorageBucket(opts?: {
  signedUrl?: QueryResult<{ signedUrl: string }>;
  upload?: QueryResult;
  remove?: QueryResult;
}) {
  return {
    createSignedUrl: vi.fn(() =>
      Promise.resolve(opts?.signedUrl ?? { data: { signedUrl: 'https://signed.example/x' }, error: null }),
    ),
    upload: vi.fn(() => Promise.resolve(opts?.upload ?? { data: { path: 'x' }, error: null })),
    remove: vi.fn(() => Promise.resolve(opts?.remove ?? { data: [], error: null })),
  };
}

/** Convenience: a resolved `auth.getUser()` payload for an authenticated user. */
export function authedUser(id = 'user-1') {
  return { data: { user: { id } }, error: null };
}

/** Convenience: a resolved `auth.getUser()` payload for a signed-out caller. */
export function anonUser() {
  return { data: { user: null }, error: null };
}
