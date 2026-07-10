/**
 * One-time migration of conclusion-step "summary photos" that older builds
 * persisted only to AsyncStorage (`<prefix>:<id>:summaryPhotos`) instead of the
 * equipment table's `summary_photos` column. Bobcat and excavator were the two
 * offenders (see docs/reports/BUG_REPORT.md, 2026-07-07) — the photo *files*
 * were uploaded to storage, but the path list lived only on-device, so the
 * photos vanished from the detail view / PDF (bobcat) or never reached other
 * surfaces (excavator).
 *
 * When the loaded inspection has no DB-backed summary photos but the legacy key
 * holds a non-empty list, the hook:
 *   1. calls `apply(paths)` so the open screen shows the photos immediately,
 *   2. persists the list to the DB via `persist(paths)` (service patch),
 *   3. removes the legacy key once the DB write succeeds — kept on failure
 *      (e.g. offline) so the next open retries.
 *
 * When the DB row already has photos, the legacy key is just cleaned up.
 * Reads AsyncStorage at most once per inspection id. New writes never touch
 * the legacy key, so this hook can be deleted once pre-2026-07 installs age out.
 */
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useLegacySummaryPhotoRecovery(opts: {
  /** Loaded inspection id, or null while loading. */
  inspectionId: string | null;
  /** Summary photos already on the DB row — recovery is skipped when non-empty. */
  dbPhotos: string[] | undefined;
  /** The legacy AsyncStorage key, e.g. `bobcat-wizard:${id}:summaryPhotos`. */
  legacyKey: string;
  /** Write the recovered list to the DB (e.g. `api.patch(id, { summaryPhotos })`). */
  persist: (photos: string[]) => Promise<void>;
  /** Merge the recovered list into screen state (guard against overwriting newer photos). */
  apply: (photos: string[]) => void;
}): void {
  const { inspectionId, dbPhotos, legacyKey } = opts;
  const attemptedFor = useRef<string | null>(null);

  // Latest callbacks without retriggering the effect.
  const persistRef = useRef(opts.persist);
  const applyRef = useRef(opts.apply);
  persistRef.current = opts.persist;
  applyRef.current = opts.apply;

  useEffect(() => {
    if (!inspectionId || attemptedFor.current === inspectionId) return;
    attemptedFor.current = inspectionId;

    if (dbPhotos && dbPhotos.length > 0) {
      // DB already owns the photos — the legacy copy is stale; drop it.
      AsyncStorage.removeItem(legacyKey).catch(() => {});
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(legacyKey);
        if (!saved || cancelled) return;
        const parsed: unknown = JSON.parse(saved);
        if (
          !Array.isArray(parsed) ||
          parsed.length === 0 ||
          parsed.some((p) => typeof p !== 'string')
        ) return;
        applyRef.current(parsed as string[]);
        await persistRef.current(parsed as string[]);
        await AsyncStorage.removeItem(legacyKey);
      } catch {
        // Best-effort: leave the legacy key in place so the next open retries.
      }
    })();
    return () => { cancelled = true; };
  }, [inspectionId, dbPhotos, legacyKey]);
}
