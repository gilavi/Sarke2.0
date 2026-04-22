import { storageApi } from './services';
import { blobToDataUrl } from './blob';

/**
 * Fetch a storage object and return it as a base64 `data:` URL, falling back
 * to a public URL if the authenticated download fails (e.g. network hiccup,
 * missing permissions, or the bucket is actually public).
 *
 * Used throughout the app to render signatures, answer photos, and certificate
 * files reliably in `<Image>` components and in the PDF WebView (which can't
 * reach the Supabase signed-URL endpoint during print).
 */
export async function getStorageImageDataUrl(
  bucket: string,
  path: string,
): Promise<string> {
  try {
    const blob = await storageApi.download(bucket, path);
    return await blobToDataUrl(blob);
  } catch {
    return storageApi.publicUrl(bucket, path);
  }
}
