import * as FileSystem from 'expo-file-system/legacy';
import { storageApi } from './services';
import { blobToDataUrl } from './blob';

/**
 * Fetch a storage object and return it as a base64 `data:` URL.
 *
 * Strategy (in order):
 *  1. Signed URL → native `FileSystem.downloadAsync` → `readAsStringAsync(Base64)`.
 *     Most reliable on React Native — no Blob/FileReader quirks in Hermes.
 *  2. Signed URL → `fetch()` → `blob()` → `blobToDataUrl`.
 *     No FileSystem dependency; works when step 1 fails (e.g. temp-dir issues).
 *  3. Authenticated Supabase blob download → `blobToDataUrl`.
 *     Fallback when signed-URL generation fails but the session is valid.
 *  4. Raw signed URL / public URL — last resort; the PDF WebView usually
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
    if (cacheBase) {
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
    }
  } catch {
    // fall through
  }

  // 2. Signed URL + fetch → blobToDataUrl (no FileSystem dependency)
  try {
    const signed = await storageApi.signedUrl(bucket, path, 3600);
    const response = await fetch(signed);
    if (response.ok) {
      const blob = await response.blob();
      const result = await blobToDataUrl(blob);
      if (result.startsWith('data:')) return result;
    }
  } catch {
    // fall through
  }

  // 3. Authenticated download + FileReader / arrayBuffer fallback
  try {
    const blob = await storageApi.download(bucket, path);
    return await blobToDataUrl(blob);
  } catch {
    // fall through
  }

  // 4. Last-resort remote URL (likely won't render in the PDF WebView, but we
  // always return a valid-looking string so callers don't have to branch).
  try {
    return await storageApi.signedUrl(bucket, path, 3600);
  } catch {
    return storageApi.publicUrl(bucket, path);
  }
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
