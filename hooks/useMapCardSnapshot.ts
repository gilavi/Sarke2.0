/**
 * useMapCardSnapshot — cached static raster for a decorative map card, so
 * list/carousel cards never hold N live MKMapViews on iOS (`liteMode` is
 * Android-only; each live map costs ~15–30 MB native memory + tile fetches).
 * Cold cache: mount the live MapView once, `captureSnapshot(ref)` from
 * `onMapReady` rasterizes it into `<cacheDirectory>/map-card-snapshots/`
 * (keyed by id + coords + card size + OS color scheme — Apple Maps tiles
 * follow the system trait). Warm cache: `snapshotUri` resolves from memo/disk
 * and the MapView never mounts. Only map tiles are persisted — never
 * regulated content. Inert on Android/web (`snapshotUri` stays null).
 * See docs/primitives.md → "Decorative map card".
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Platform, useColorScheme } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/** Identity + geometry of one map card; the cache key derives from all fields. */
export interface MapCardSpec {
  id: string;
  latitude: number;
  longitude: number;
  width: number;
  height: number;
}

/** Minimal snapshot surface of a react-native-maps MapView ref. */
export interface MapSnapshotSource {
  takeSnapshot(args: { format?: 'png' | 'jpg'; quality?: number; result?: 'file' | 'base64' }): Promise<string>;
}

// Only iOS pays the full-native-map cost; Android cards keep liteMode.
const ENABLED = Platform.OS === 'ios';
// key → file:// URI of a snapshot known to exist on disk (module-lifetime).
const snapshotMemo = new Map<string, string>();
// keys whose disk probe already settled (hit or miss) — probe once per launch.
const probed = new Set<string>();

let dirEnsured: Promise<string | null> | null = null;
function ensureSnapshotDir(): Promise<string | null> {
  if (dirEnsured) return dirEnsured;
  dirEnsured = (async () => {
    const base = FileSystem.cacheDirectory;
    if (!base) return null;
    const dir = `${base}map-card-snapshots/`;
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      return dir;
    } catch {
      return null;
    }
  })();
  return dirEnsured;
}

function snapshotKey(card: MapCardSpec, scheme: string): string {
  const size = `${Math.round(card.width)}x${Math.round(card.height)}`;
  const raw = [card.id, card.latitude.toFixed(5), card.longitude.toFixed(5), size, scheme].join('_');
  return raw.replace(/[^A-Za-z0-9_.-]/g, '-');
}

/**
 * Resolve (or lazily create) the cached map snapshot for one card.
 * @param card Card identity/geometry, or null when there are no coordinates.
 * @returns `snapshotUri` — file:// URI to render instead of a live MapView;
 *   `resolving` — disk probe in flight, render neither map nor image yet (so
 *   a warm relaunch never pays the MKMapView init just to unmount it); when
 *   both are falsy the caller must render its live MapView. `captureSnapshot`
 *   — call with the MapView ref from `onMapReady` to rasterize once;
 *   `onSnapshotError` — image onError → evict the broken cache entry.
 */
export function useMapCardSnapshot(card: MapCardSpec | null): {
  snapshotUri: string | null;
  resolving: boolean;
  captureSnapshot: (map: MapSnapshotSource | null) => void;
  onSnapshotError: () => void;
} {
  const scheme = useColorScheme() ?? 'light';
  const key = ENABLED && card ? snapshotKey(card, scheme) : null;
  // The memo map is the single source of truth; state only forces re-renders,
  // so a key change (coords edit, OS scheme flip) resolves in the same frame.
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const busyRef = useRef(false);

  // One disk probe per key per launch (first mount after a relaunch).
  useEffect(() => {
    if (!key || snapshotMemo.has(key) || probed.has(key)) return;
    void (async () => {
      try {
        const dir = await ensureSnapshotDir();
        if (dir) {
          const file = `${dir}${key}.png`;
          const info = await FileSystem.getInfoAsync(file);
          if (info.exists && ((info as { size?: number }).size ?? 0) > 32) {
            snapshotMemo.set(key, file);
          }
        }
      } catch {
        // miss — fall through to the live map
      } finally {
        probed.add(key); bump();
      }
    })();
  }, [key]);

  const captureSnapshot = useCallback(
    (map: MapSnapshotSource | null) => {
      if (!key || !map || busyRef.current || snapshotMemo.has(key)) return;
      busyRef.current = true;
      void (async () => {
        try {
          const dir = await ensureSnapshotDir();
          if (!dir) return;
          // No width/height/region args: native uses the map's current bounds
          // + region, so the raster matches the live map (seamless swap).
          const tmp = await map.takeSnapshot({ format: 'png', result: 'file' });
          const from = tmp.startsWith('file://') ? tmp : `file://${tmp}`;
          const file = `${dir}${key}.png`;
          await FileSystem.deleteAsync(file, { idempotent: true });
          await FileSystem.moveAsync({ from, to: file });
          snapshotMemo.set(key, file); bump();
        } catch {
          // Offline / snapshot failure: keep the live map for this session.
        } finally {
          busyRef.current = false;
        }
      })();
    },
    [key],
  );

  const onSnapshotError = useCallback(() => {
    if (!key) return;
    snapshotMemo.delete(key);
    void (async () => {
      // best-effort disk eviction
      const dir = await ensureSnapshotDir().catch(() => null);
      if (dir) await FileSystem.deleteAsync(`${dir}${key}.png`, { idempotent: true }).catch(() => {});
    })();
    bump();
  }, [key]);

  return {
    snapshotUri: key ? (snapshotMemo.get(key) ?? null) : null,
    resolving: key != null && !snapshotMemo.has(key) && !probed.has(key),
    captureSnapshot,
    onSnapshotError,
  };
}
