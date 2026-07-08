// Shared constants + URI helpers for the /photo-picker flow (camera + gallery).
// Extracted from app/photo-picker.tsx so the route stays a thin orchestrator.
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

// Pinch sensitivity: a 2× finger spread adds ~0.5 to the 0–1 zoom range.
export const ZOOM_SENSITIVITY = 0.5;
// Cap on a single system-library multi-pick.
export const SELECTION_LIMIT = 10;
// CameraView zoom is 0–1; show it as a friendly 1.0×–5× factor.
export const zoomLabel = (z: number) => `${(1 + z * 4).toFixed(1)}×`;

/**
 * iCloud-backed / ph:// URIs aren't readable by FileSystem - copy them to a
 * local cache file we can hand to fetch/upload. Pass-through for local URIs.
 *
 * @param uri source asset URI (may be `ph://` / iCloud on iOS)
 * @param id  stable id used to name the local cache copy
 * @returns a `file://` URI readable by FileSystem/fetch/upload
 */
export async function toLocalUri(uri: string, id: string): Promise<string> {
  if (uri.startsWith('ph://') || uri.includes('icloud')) {
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    const localCopy = `${dir}local_${id}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: localCopy });
    return localCopy;
  }
  return uri;
}

/**
 * Resolve a recent-strip asset (MediaLibrary) to a readable local URI.
 * Side effect: may copy an iCloud/ph:// asset into the cache dir (via toLocalUri).
 */
export async function resolveAssetUri(asset: MediaLibrary.Asset): Promise<string> {
  const info = await MediaLibrary.getAssetInfoAsync(asset);
  return toLocalUri(info.localUri ?? asset.uri, asset.id);
}
