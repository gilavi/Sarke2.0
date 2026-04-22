import { storageApi } from './services';
import { blobToDataUrl } from './blob';

/**
 * Fetch a storage object and return it as a base64 `data:` URL.
 *
 * Strategy (in order):
 *  1. Authenticated blob download → base64 data URL  (works for private buckets)
 *  2. Signed URL (60-min expiry)                      (fallback if blob fails)
 *  3. Public URL                                      (last resort for public buckets)
 *
 * A data URL is always preferred because the PDF WebView can't reach
 * Supabase signed-URL endpoints during expo-print rendering.
 */
export async function getStorageImageDataUrl(
  bucket: string,
  path: string,
): Promise<string> {
  // 1. Try direct authenticated download → embed as base64
  try {
    const blob = await storageApi.download(bucket, path);
    return await blobToDataUrl(blob);
  } catch {
    // fall through
  }

  // 2. Try a short-lived signed URL
  try {
    return await storageApi.signedUrl(bucket, path, 3600);
  } catch {
    // fall through
  }

  // 3. Last resort: public URL (only works if bucket is set to public)
  return storageApi.publicUrl(bucket, path);
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
