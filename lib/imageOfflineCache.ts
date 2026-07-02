// Internal disk-cache store for lib/imageUrl.ts — NOT a public primitive.
// Consume the public API (imageForDisplay / signatureAsDataUrl) instead of
// these helpers; this file exists as a sibling only to keep lib/imageUrl.ts
// under its file-size target.

import * as FileSystem from 'expo-file-system/legacy';

/** djb2 hash → hex; the shared cache-key scheme for all imageUrl disk caches. */
export function djb2Hex(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

// ── Display cache (offline copies of already-seen images) ────────────────────

const DISPLAY_CACHE_DIR_NAME = 'image-display-cache';

let displayDirEnsured: Promise<string | null> | null = null;
function ensureDisplayCacheDir(): Promise<string | null> {
  if (displayDirEnsured) return displayDirEnsured;
  displayDirEnsured = (async () => {
    const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!base) return null;
    const dir = `${base}${DISPLAY_CACHE_DIR_NAME}/`;
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      return dir;
    } catch {
      return null;
    }
  })();
  return displayDirEnsured;
}

/** Cache-file path for a storage object (null when no FS dir is available). */
export async function displayCacheFile(
  bucket: string,
  path: string,
  ext: string,
): Promise<string | null> {
  const dir = await ensureDisplayCacheDir();
  if (!dir) return null;
  return `${dir}${djb2Hex(`${bucket}/${path}`)}.${ext}`;
}

/** The cached file:// URI, or null on miss/torn write. */
export async function readDisplayCache(file: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(file);
    if (info.exists && ((info as { size?: number }).size ?? 0) > 32) return file;
  } catch {
    // miss
  }
  return null;
}

/**
 * Fire-and-forget: download the signed URL into the cache slot if absent.
 * Downloads to a `.part` file first so a killed app never leaves a torn
 * entry. Online display always uses the fresh signed URL — this only feeds
 * the offline path.
 */
export function warmDisplayCache(signedUrl: string, file: string): void {
  void (async () => {
    try {
      const info = await FileSystem.getInfoAsync(file);
      if (info.exists) return;
      const tmp = `${file}.part`;
      const res = await FileSystem.downloadAsync(signedUrl, tmp);
      if (res.status === 200) {
        await FileSystem.moveAsync({ from: tmp, to: file });
      } else {
        await FileSystem.deleteAsync(tmp, { idempotent: true });
      }
    } catch {
      // best-effort warm
    }
  })();
}

// ── Signature cache ──────────────────────────────────────────────────────────
//
// REGULATORY GUARD: allow-listed to the `signatures` bucket ONLY — it holds
// the reusable expert signature (`users.saved_signature_url`), which CLAUDE.md
// explicitly exempts from the no-persistence rule. Never add
// `remote-signatures` here, and never cache capture-time signature data
// (those live in component state only and die on unmount). Lives under
// documentDirectory: an OS cache purge must not silently strip signatures out
// of offline-generated PDFs.

const SIGNATURE_CACHE_DIR_NAME = 'signature-cache';
const SIGNATURE_CACHE_BUCKETS = new Set(['signatures']);

let signatureDirEnsured: Promise<string | null> | null = null;
function ensureSignatureCacheDir(): Promise<string | null> {
  if (signatureDirEnsured) return signatureDirEnsured;
  signatureDirEnsured = (async () => {
    const base = FileSystem.documentDirectory;
    if (!base) return null;
    const dir = `${base}${SIGNATURE_CACHE_DIR_NAME}/`;
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      return dir;
    } catch {
      return null;
    }
  })();
  return signatureDirEnsured;
}

/** Cache-file path, or null when the bucket is not allow-listed / no FS. */
export async function signatureCacheFile(bucket: string, path: string): Promise<string | null> {
  if (!SIGNATURE_CACHE_BUCKETS.has(bucket)) return null;
  const dir = await ensureSignatureCacheDir();
  if (!dir) return null;
  return `${dir}${djb2Hex(`${bucket}/${path}`)}.dataurl`;
}

/** The cached data: URL, or null on miss/corruption. */
export async function readSignatureCache(file: string): Promise<string | null> {
  try {
    const raw = await FileSystem.readAsStringAsync(file);
    const comma = raw.indexOf(',');
    if (raw.startsWith('data:') && comma > 0 && raw.length - comma - 1 >= 32) return raw;
  } catch {
    // miss
  }
  return null;
}

/** Fire-and-forget write-through (the expert signature is overwritten in place on re-save). */
export function writeSignatureCache(file: string, dataUrl: string): void {
  FileSystem.writeAsStringAsync(file, dataUrl).catch(() => undefined);
}
