import { useEffect, useState } from 'react';
import { imageForDisplay } from '../lib/imageUrl';

/**
 * Resolve a list of storage paths to display URIs, cached by path so changing
 * one entry doesn't refetch the others. Returns URIs aligned 1:1 with `paths`
 * (`null` for a null path, one still loading, or — since a hard failure is never
 * cached — one whose resolution threw; in practice `imageForDisplay` cannot throw,
 * so the last case is unreachable today).
 *
 * Use when a screen shows several stored images at once and wants a single,
 * de-duplicated resolution pass (e.g. the report slide editor feeds the same
 * `uris` to both the live preview and the photo tiles). For a single image,
 * resolving inline with `imageForDisplay` is fine.
 */
export function useResolvedImageUris(
  bucket: string,
  paths: (string | null)[],
): (string | null)[] {
  const [cache, setCache] = useState<Record<string, string>>({});
  const sig = paths.join('|');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const todo = paths.filter((p): p is string => !!p && !(p in cache));
      if (todo.length === 0) return;
      const entries = await Promise.all(
        todo.map(async p => {
          try {
            return [p, await imageForDisplay(bucket, p)] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const add = Object.fromEntries(entries.filter(Boolean) as (readonly [string, string])[]);
      if (Object.keys(add).length) setCache(prev => ({ ...prev, ...add }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, bucket]);

  return paths.map(p => (p ? cache[p] ?? null : null));
}
