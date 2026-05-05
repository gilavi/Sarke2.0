import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { storageApi } from './services';
import { blobToDataUrl } from './blob';

// ─────────────────────────────────────────────────────────────────────────────
// Public API — three functions, named by purpose so the right default falls
// out of picking the right name:
//
//   imageForDisplay(bucket, path)
//     → URL for a React Native <Image>. Prefers a signed URL. Falls back to
//       a data: URL via auth download, then to the public URL. Cannot fail.
//
//   pdfPhotoEmbed(bucket, path, opts?)
//     → data: URL for embedding photos in PDF HTML. Resized to 1200px /
//       JPEG 0.7 with on-disk caching (required to keep the print WebView
//       from freezing on photo-heavy reports). Throws if the strict
//       data-URL pipeline fails.
//
//   signatureAsDataUrl(bucket, path)
//     → data: URL for a signature, byte-exact (small PNG, anti-aliasing
//       matters). Used by PDF embeds and the canvas pre-fill in the
//       signature sheet. Throws if no data-URL strategy yields a non-empty
//       payload.
//
// Do NOT add new public helpers here. If a fourth need arises, push back —
// almost certainly it's one of these three with a different opt. Adding a
// fourth name is exactly how this file ended up with four overlapping
// helpers and silently-wrong defaults to begin with.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * URL for direct display in a React Native `<Image>`. Prefers a signed URL
 * (the network layer fetches it). Falls back to an authenticated download as
 * a data: URL, then to the public URL. Always returns a string.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      val => { clearTimeout(timer); resolve(val); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

export async function imageForDisplay(
  bucket: string,
  path: string,
  timeoutMs: number = 8000,
): Promise<string> {
  try {
    return await withTimeout(storageApi.signedUrl(bucket, path, 3600), timeoutMs);
  } catch {
    // fall through
  }
  try {
    const blob = await withTimeout(storageApi.download(bucket, path), timeoutMs);
    return await blobToDataUrl(blob);
  } catch {
    // fall through
  }
  return storageApi.publicUrl(bucket, path);
}

/**
 * `data:` URL for embedding a photo in PDF HTML. Resized to 1200px / JPEG 0.7
 * with on-disk cache. Throws if the source is missing or the manipulator fails.
 */
export async function pdfPhotoEmbed(
  bucket: string,
  path: string,
  opts?: { maxWidth?: number; quality?: number },
): Promise<string> {
  return fetchResizedDataUrl(bucket, path, {
    maxWidth: opts?.maxWidth ?? PDF_PHOTO_MAX_WIDTH,
    quality: opts?.quality ?? PDF_PHOTO_QUALITY,
  });
}

/**
 * `data:` URL for a signature image, byte-exact (no resize, no re-encode).
 * Used by PDF embeds (where the WebView can't fetch Supabase URLs at render
 * time) and by the signature-sheet canvas pre-fill.
 */
export async function signatureAsDataUrl(
  bucket: string,
  path: string,
): Promise<string> {
  return fetchAsDataUrlStrict(bucket, path);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals — not exported. If you find yourself reaching for one of these
// from outside this file, add an option to the public API instead.
// ─────────────────────────────────────────────────────────────────────────────

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
      if (!blob || (blob as { size?: number }).size === 0) {
        const e = new Error('xhr empty blob');
        (e as { code?: string }).code = EMPTY_SOURCE;
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
 * Fetch a storage object as a `data:` URL using the layered fallback ladder
 * (XHR → FileSystem → fetch → auth download). Throws if no strategy yields a
 * non-empty data URL.
 */
async function fetchAsDataUrl(bucket: string, path: string): Promise<string> {
  let sourceIsEmpty = false;

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

  if (sourceIsEmpty) {
    try {
      const blob = await storageApi.download(bucket, path);
      const result = await blobToDataUrl(blob);
      if (!result.startsWith('data:')) throw new Error('blobToDataUrl returned non-data URL');
      return result;
    } catch (err) {
      logStepFailure(5, bucket, path, err);
    }
    throw new Error(`storage object ${bucket}/${path} is empty`);
  }

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

  try {
    const blob = await storageApi.download(bucket, path);
    const result = await blobToDataUrl(blob);
    if (!result.startsWith('data:')) throw new Error('blobToDataUrl returned non-data URL');
    return result;
  } catch (err) {
    logStepFailure(5, bucket, path, err);
  }

  throw new Error(`failed to fetch ${bucket}/${path} as data URL`);
}

/**
 * Strict guard around `fetchAsDataUrl`: rejects empty/short payloads
 * (`data:image/jpeg;base64,` with nothing after the comma) so they don't
 * silently render as broken `<img>` tags inside a PDF.
 */
async function fetchAsDataUrlStrict(bucket: string, path: string): Promise<string> {
  const result = await fetchAsDataUrl(bucket, path);
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

function djb2Hex(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

async function fetchResizedDataUrl(
  bucket: string,
  path: string,
  opts: { maxWidth: number; quality: number },
): Promise<string> {
  const { maxWidth, quality } = opts;
  const cacheKey = djb2Hex(`${bucket}/${path}@w${maxWidth}q${quality}`);
  const cacheDir = await ensurePdfCacheDir();

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

  const sourceDataUrl = await fetchAsDataUrlStrict(bucket, path);

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

  if (cacheDir) {
    const cached = `${cacheDir}${cacheKey}.jpg`;
    FileSystem.writeAsStringAsync(cached, outBase64, {
      encoding: FileSystem.EncodingType.Base64,
    }).catch(() => undefined);
  }
  if (resized.uri) {
    FileSystem.deleteAsync(resized.uri, { idempotent: true }).catch(() => undefined);
  }
  return `data:image/jpeg;base64,${outBase64}`;
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
