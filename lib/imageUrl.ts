import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { storageApi } from './services';
import { blobToDataUrl } from './blob';

// Marker error thrown by step 1 when the signed URL returns 200 + 0 bytes —
// the storage object exists but has no content. Subsequent URL-based fallback
// steps (2-4) hit the same backend and would re-confirm the same emptiness;
// short-circuit to the auth-download step (5) instead of paying 4 more
// network round-trips per missing file.
const EMPTY_SOURCE = '__imageUrl.emptySource__';

function logStepFailure(
  step: number,
  bucket: string,
  path: string,
  err: unknown,
): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[imageUrl] step ${step} failed for ${bucket}/${path}: ${message}`);
}

/**
 * Fetch a signed URL via XMLHttpRequest, get a Blob back, and turn it into
 * a `data:` URL using FileReader. This is the **canonical** binary-download
 * pattern on React Native — `fetch().arrayBuffer()` and the new
 * `expo-file-system` download API both return 0 bytes for binary responses
 * in Hermes on SDK 54, but XHR's `responseType = 'blob'` path is the one
 * Supabase / Firebase / every RN tutorial actually uses, and it works.
 */
function xhrSignedUrlToDataUrl(
  signed: string,
  fallbackMime: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = () => {
      if (xhr.status !== 200) {
        reject(new Error(`xhr status ${xhr.status}`));
        return;
      }
      const blob: Blob | null = xhr.response;
      if (!blob || (blob as any).size === 0) {
        // Mark as authoritatively empty so callers can skip the redundant
        // URL-based fallbacks. A 200 + 0 bytes is the storage layer telling
        // us the object has no content — retrying via fetch/FileSystem won't
        // change that.
        const e = new Error('xhr empty blob');
        (e as any).code = EMPTY_SOURCE;
        reject(e);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const r = reader.result;
        if (typeof r !== 'string' || !r.startsWith('data:')) {
          reject(new Error('xhr FileReader produced no data URL'));
          return;
        }
        const comma = r.indexOf(',');
        if (comma < 0 || r.length - comma - 1 < 32) {
          reject(new Error('xhr FileReader produced empty data URL'));
          return;
        }
        // FileReader on RN sometimes emits `data:application/octet-stream;…`
        // when the blob has no type — patch in the right MIME so the WebView
        // decodes the image instead of treating it as a binary download.
        if (r.startsWith('data:application/octet-stream') && fallbackMime) {
          resolve(`data:${fallbackMime};base64,${r.slice(r.indexOf(',') + 1)}`);
          return;
        }
        resolve(r);
      };
      reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
      reader.readAsDataURL(blob);
    };
    xhr.onerror = () => reject(new Error('xhr network error'));
    xhr.ontimeout = () => reject(new Error('xhr timeout'));
    xhr.open('GET', signed);
    xhr.send();
  });
}

/**
 * Fetch a storage object and return it as a base64 `data:` URL.
 *
 * Strategy (in order):
 *  1. Signed URL → `XMLHttpRequest` (responseType=blob) → `FileReader.readAsDataURL`.
 *     Canonical RN binary-download pattern; works around the Hermes/SDK 54
 *     bug where `fetch().arrayBuffer()` and `FileSystem.downloadAsync` both
 *     return empty bytes for binary responses.
 *  2. Signed URL → `FileSystem.downloadAsync` → `readAsStringAsync(Base64)`.
 *  3. Signed URL → `fetch()` → `arrayBuffer()` → manual base64.
 *  4. Signed URL → `fetch()` → `blob()` → `blobToDataUrl`.
 *  5. Authenticated Supabase blob download → `blobToDataUrl`.
 *  6. Raw signed URL / public URL — last resort; the PDF WebView usually
 *     can't load these, but we return *something* rather than blowing up.
 */
export async function getStorageImageDataUrl(
  bucket: string,
  path: string,
): Promise<string> {
  let sourceIsEmpty = false;

  // 1. XHR + FileReader — the only path that's reliable for binary responses
  //    on Hermes/SDK 54.
  try {
    const signed = await storageApi.signedUrl(bucket, path, 3600);
    const ext = normalizedExt(path);
    const fallbackMime = inferMime(ext) ?? 'image/jpeg';
    return await xhrSignedUrlToDataUrl(signed, fallbackMime);
  } catch (err) {
    logStepFailure(1, bucket, path, err);
    if ((err as { code?: string } | null)?.code === EMPTY_SOURCE) {
      sourceIsEmpty = true;
    }
  }

  // If step 1 confirmed the storage object is empty (200 + 0 bytes), skip
  // steps 2-4 — they hit the exact same signed URL with different network
  // libraries and will report the same emptiness. Jump to the auth-download
  // path which uses a different storage API endpoint as a final sanity check.
  if (sourceIsEmpty) {
    try {
      const blob = await storageApi.download(bucket, path);
      const result = await blobToDataUrl(blob);
      if (!result.startsWith('data:')) throw new Error('blobToDataUrl returned non-data URL');
      return result;
    } catch (err) {
      logStepFailure(5, bucket, path, err);
    }
    // Last resort — return a remote URL even though the WebView won't render it.
    try {
      return await storageApi.signedUrl(bucket, path, 3600);
    } catch {
      return storageApi.publicUrl(bucket, path);
    }
  }

  // 2. Signed URL + native file download → base64
  try {
    const signed = await storageApi.signedUrl(bucket, path, 3600);
    const ext = normalizedExt(path);
    const cacheBase = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!cacheBase) throw new Error('no cache directory available');
    const tmp = `${cacheBase}pdf-embed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || 'bin'}`;
    try {
      const res = await FileSystem.downloadAsync(signed, tmp);
      if (res.status !== 200) throw new Error(`download status ${res.status}`);
      const base64 = await FileSystem.readAsStringAsync(tmp, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!base64) throw new Error('empty base64');
      const mime = contentTypeFromHeaders(res.headers) ?? inferMime(ext) ?? 'image/jpeg';
      return `data:${mime};base64,${base64}`;
    } finally {
      FileSystem.deleteAsync(tmp, { idempotent: true }).catch(() => undefined);
    }
  } catch (err) {
    logStepFailure(2, bucket, path, err);
  }

  // 3. Signed URL + fetch → arrayBuffer → manual base64 (no Blob, no FileSystem)
  try {
    const signed = await storageApi.signedUrl(bucket, path, 3600);
    const response = await fetch(signed);
    if (!response.ok) throw new Error(`fetch status ${response.status}`);
    const ab = await response.arrayBuffer();
    if (!ab.byteLength) throw new Error('empty arrayBuffer');
    const base64 = arrayBufferToBase64(ab);
    if (!base64) throw new Error('empty base64');
    const ext = normalizedExt(path);
    const mime = response.headers.get('content-type')?.split(';')[0]?.trim()
      || inferMime(ext)
      || 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    logStepFailure(3, bucket, path, err);
  }

  // 4. Signed URL + fetch → blobToDataUrl
  try {
    const signed = await storageApi.signedUrl(bucket, path, 3600);
    const response = await fetch(signed);
    if (!response.ok) throw new Error(`fetch status ${response.status}`);
    const blob = await response.blob();
    const result = await blobToDataUrl(blob);
    if (!result.startsWith('data:')) throw new Error('blobToDataUrl returned non-data URL');
    return result;
  } catch (err) {
    logStepFailure(4, bucket, path, err);
  }

  // 5. Authenticated download + blobToDataUrl
  try {
    const blob = await storageApi.download(bucket, path);
    const result = await blobToDataUrl(blob);
    if (!result.startsWith('data:')) throw new Error('blobToDataUrl returned non-data URL');
    return result;
  } catch (err) {
    logStepFailure(5, bucket, path, err);
  }

  // 6. Last-resort remote URL (likely won't render in the PDF WebView, but we
  // always return a valid-looking string so callers don't have to branch).
  try {
    return await storageApi.signedUrl(bucket, path, 3600);
  } catch {
    return storageApi.publicUrl(bucket, path);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk) as number[]);
  }
  const g = globalThis as unknown as {
    btoa?: (s: string) => string;
    Buffer?: { from: (s: string, enc: string) => { toString: (enc: string) => string } };
  };
  if (typeof g.btoa === 'function') return g.btoa(binary);
  if (g.Buffer) return g.Buffer.from(binary, 'binary').toString('base64');
  throw new Error('no base64 encoder available');
}

/**
 * Strict variant of `getStorageImageDataUrl` for PDF embedding: returns a
 * `data:` URL or throws. Use when a remote-URL fallback would silently
 * break the PDF (the print WebView can't fetch Supabase signed URLs
 * during rendering).
 */
export async function getStorageImageDataUrlStrict(
  bucket: string,
  path: string,
): Promise<string> {
  const result = await getStorageImageDataUrl(bucket, path);
  // Reject `data:image/jpeg;base64,` (valid prefix, empty payload) — that's
  // what the FileReader fallback returns for a 0-byte storage object, and
  // the prefix check alone happily lets it through into the PDF as a broken
  // `<img>`. Require at least 32 chars of base64 after the comma.
  const comma = result.indexOf(',');
  if (
    !result.startsWith('data:') ||
    comma < 0 ||
    result.length - comma - 1 < 32
  ) {
    throw new Error(`failed to embed ${bucket}/${path} as data URL`);
  }
  return result;
}

// ── PDF photo cache ──────────────────────────────────────────────────────────
//
// PDF generation embeds storage images as base64 data URLs in the rendered
// HTML. Stock 12MP iPhone photos serialize to ~2 MB of base64 each, and a
// report with N photos produces an N×2 MB HTML string that WKWebView has to
// parse + decode on the JS thread — observed at 5.4 MB for 2 photos in the
// field. The fix is twofold:
//
//   1. Resize via `expo-image-manipulator` to max 1200px / JPEG 0.7 before
//      embedding. ~10x size reduction with no visible quality loss in print.
//   2. Persist the resized JPEG to `FileSystem.cacheDirectory` keyed by
//      bucket+path. Re-generating the same report (same source images) skips
//      the download + resize entirely.

const PDF_PHOTO_MAX_WIDTH = 1200;
const PDF_PHOTO_QUALITY = 0.7;
const PDF_CACHE_DIR_NAME = 'pdf-photo-cache';

let pdfCacheDirEnsured: Promise<string | null> | null = null;
function ensurePdfCacheDir(): Promise<string | null> {
  if (pdfCacheDirEnsured) return pdfCacheDirEnsured;
  pdfCacheDirEnsured = (async () => {
    const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!base) return null;
    const dir = `${base}${PDF_CACHE_DIR_NAME}/`;
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      return dir;
    } catch {
      return null;
    }
  })();
  return pdfCacheDirEnsured;
}

// Lightweight non-cryptographic hash. The keyspace is small (a few hundred
// storage paths per user) so collision risk from a 32-bit hash is negligible
// for a content-addressed cache; we don't need expo-crypto for this.
function djb2Hex(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

/**
 * Download → resize → base64 a Storage image, suitable for embedding in a
 * `<img src="data:...">` inside a generated PDF. Cached on disk by bucket+path
 * so subsequent calls for the same source skip both the network fetch and the
 * resize. Output is always JPEG so the cache hits regardless of the source
 * format (HEIC, PNG, etc.).
 *
 * Throws if the source is genuinely missing or the manipulator fails.
 */
export async function getStorageImageResizedDataUrl(
  bucket: string,
  path: string,
  opts?: { maxWidth?: number; quality?: number },
): Promise<string> {
  const maxWidth = opts?.maxWidth ?? PDF_PHOTO_MAX_WIDTH;
  const quality = opts?.quality ?? PDF_PHOTO_QUALITY;
  const cacheKey = djb2Hex(`${bucket}/${path}@w${maxWidth}q${quality}`);
  const cacheDir = await ensurePdfCacheDir();

  // 1. Cache hit — read base64 directly off disk.
  if (cacheDir) {
    const cached = `${cacheDir}${cacheKey}.jpg`;
    try {
      const info = await FileSystem.getInfoAsync(cached);
      if (info.exists && (info as { size?: number }).size && (info as { size: number }).size > 32) {
        const b64 = await FileSystem.readAsStringAsync(cached, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (b64 && b64.length > 32) return `data:image/jpeg;base64,${b64}`;
      }
    } catch {
      // fall through to download
    }
  }

  // 2. Fetch the source as a data URL using the canonical RN-binary pipeline,
  //    then hand it to the manipulator (which accepts data URLs as input).
  const sourceDataUrl = await getStorageImageDataUrlStrict(bucket, path);

  // 3. Resize + re-encode as JPEG. `base64: true` asks the manipulator to
  //    return the encoded bytes directly so we don't need a second file read.
  const resized = await manipulateAsync(
    sourceDataUrl,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: SaveFormat.JPEG, base64: true },
  );
  let outBase64 = resized.base64;
  if (!outBase64 && resized.uri) {
    outBase64 = await FileSystem.readAsStringAsync(resized.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  if (!outBase64) throw new Error('manipulator returned no base64');

  // 4. Persist to cache. Best-effort — never block the PDF on a cache write.
  if (cacheDir) {
    const cached = `${cacheDir}${cacheKey}.jpg`;
    FileSystem.writeAsStringAsync(cached, outBase64, {
      encoding: FileSystem.EncodingType.Base64,
    }).catch(() => undefined);
  }
  // Clean up the manipulator's temp file once we have the bytes.
  if (resized.uri) {
    FileSystem.deleteAsync(resized.uri, { idempotent: true }).catch(() => undefined);
  }
  return `data:image/jpeg;base64,${outBase64}`;
}

/**
 * URL intended for direct display in a React Native `<Image>` — prefers a
 * signed URL so the network layer handles the fetch instead of FileReader.
 * `getStorageImageDataUrl` is still used for PDF rendering, where the
 * WebView can't reach Supabase endpoints.
 */
export async function getStorageImageDisplayUrl(
  bucket: string,
  path: string,
): Promise<string> {
  try {
    return await storageApi.signedUrl(bucket, path, 3600);
  } catch {
    // fall through
  }
  try {
    const blob = await storageApi.download(bucket, path);
    return await blobToDataUrl(blob);
  } catch {
    // fall through
  }
  return storageApi.publicUrl(bucket, path);
}

function normalizedExt(path: string): string {
  const raw = (path.split('?')[0] ?? '').split('.').pop() ?? '';
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function inferMime(ext: string): string | undefined {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
    pdf: 'application/pdf',
  };
  return map[ext];
}

function contentTypeFromHeaders(
  headers: Record<string, string> | undefined,
): string | undefined {
  if (!headers) return undefined;
  const raw = headers['content-type'] ?? headers['Content-Type'];
  if (!raw) return undefined;
  const first = raw.split(';')[0];
  return first ? first.trim() : undefined;
}
