import * as FileSystem from 'expo-file-system/legacy';
import { storageApi } from './services';
import { blobToDataUrl } from './blob';

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
 * Fetch a storage object and return it as a base64 `data:` URL.
 *
 * Strategy (in order):
 *  1. Signed URL → native `FileSystem.downloadAsync` → `readAsStringAsync(Base64)`.
 *     Most reliable on React Native — no Blob/FileReader quirks in Hermes.
 *  2. Signed URL → `fetch()` → `arrayBuffer()` → manual base64.
 *     No FileSystem and no Blob — most resilient on Hermes.
 *  3. Signed URL → `fetch()` → `blob()` → `blobToDataUrl`.
 *     Kept as an extra fallback for environments where arrayBuffer isn't on Response.
 *  4. Authenticated Supabase blob download → `blobToDataUrl`.
 *     Fallback when signed-URL generation fails but the session is valid.
 *  5. Raw signed URL / public URL — last resort; the PDF WebView usually
 *     can't load these, but we return *something* rather than blowing up.
 */
export async function getStorageImageDataUrl(
  bucket: string,
  path: string,
): Promise<string> {
  // 1. Signed URL + native file download → base64
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
    logStepFailure(1, bucket, path, err);
  }

  // 2. Signed URL + fetch → arrayBuffer → manual base64 (no Blob, no FileSystem)
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
    logStepFailure(2, bucket, path, err);
  }

  // 3. Signed URL + fetch → blobToDataUrl
  try {
    const signed = await storageApi.signedUrl(bucket, path, 3600);
    const response = await fetch(signed);
    if (!response.ok) throw new Error(`fetch status ${response.status}`);
    const blob = await response.blob();
    const result = await blobToDataUrl(blob);
    if (!result.startsWith('data:')) throw new Error('blobToDataUrl returned non-data URL');
    return result;
  } catch (err) {
    logStepFailure(3, bucket, path, err);
  }

  // 4. Authenticated download + blobToDataUrl
  try {
    const blob = await storageApi.download(bucket, path);
    const result = await blobToDataUrl(blob);
    if (!result.startsWith('data:')) throw new Error('blobToDataUrl returned non-data URL');
    return result;
  } catch (err) {
    logStepFailure(4, bucket, path, err);
  }

  // 5. Last-resort remote URL (likely won't render in the PDF WebView, but we
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
  if (!result.startsWith('data:')) {
    throw new Error(`failed to embed ${bucket}/${path} as data URL`);
  }
  return result;
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
