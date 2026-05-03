import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export type CompressionProfile =
  | 'inspection'     // 1600px, q0.75, <500KB
  | 'report'         // 1600px, q0.75, <500KB
  | 'incident'       // 1600px, q0.75, <500KB
  | 'certificate'    // 1200px, q0.80, <300KB
  | 'qualification'  // 1200px, q0.80, <300KB
  | 'logo'           // 512px,  q0.85, <100KB
  | 'signature'      // 800px,  q0.90, <200KB
  | 'document'       // no resize, q0.85
  | 'default';       // 1600px, q0.75

const PROFILE_CONFIG: Record<CompressionProfile, { maxWidth: number; quality: number; maxBytes: number }> = {
  inspection:    { maxWidth: 1600, quality: 0.75, maxBytes: 500_000 },
  report:        { maxWidth: 1600, quality: 0.75, maxBytes: 500_000 },
  incident:      { maxWidth: 1600, quality: 0.75, maxBytes: 500_000 },
  certificate:   { maxWidth: 1200, quality: 0.80, maxBytes: 300_000 },
  qualification: { maxWidth: 1200, quality: 0.80, maxBytes: 300_000 },
  logo:          { maxWidth: 512,  quality: 0.85, maxBytes: 100_000 },
  signature:     { maxWidth: 800,  quality: 0.90, maxBytes: 200_000 },
  document:      { maxWidth: 9999, quality: 0.85, maxBytes: 1_000_000 },
  default:       { maxWidth: 1600, quality: 0.75, maxBytes: 500_000 },
};

export interface CompressOptions {
  profile?: CompressionProfile;
  maxWidth?: number;
  quality?: number;
  maxFileSizeBytes?: number;
  preserveFormat?: boolean;
}

export async function compressPhoto(
  sourceUri: string,
  options?: CompressOptions,
): Promise<{ uri: string; width: number; height: number; sizeBytes: number }> {
  const cfg = options?.profile ? PROFILE_CONFIG[options.profile] : PROFILE_CONFIG.default;
  const maxWidth = options?.maxWidth ?? cfg.maxWidth;
  const quality = options?.quality ?? cfg.quality;
  const maxBytes = options?.maxFileSizeBytes ?? cfg.maxBytes;

  const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
  const origSize = (sourceInfo as any)?.size ?? 0;
  console.log(`[compressPhoto] BEFORE: ${origSize} bytes`);

  // Always run through manipulator once to strip EXIF + normalize
  let result = await manipulateAsync(
    sourceUri,
    maxWidth < 9000 ? [{ resize: { width: maxWidth } }] : [],
    {
      compress: quality,
      format: options?.preserveFormat ? SaveFormat.PNG : SaveFormat.JPEG,
      base64: false,
    },
  );

  let outInfo = await FileSystem.getInfoAsync(result.uri);
  let outSize = (outInfo as any)?.size ?? 0;

  // Adaptive 2nd pass if over target
  if (maxBytes && outSize > maxBytes && quality > 0.3) {
    const q2 = Math.max(0.3, quality * 0.7);
    console.log(`[compressPhoto] 2nd pass: quality ${quality} → ${q2}`);
    result = await manipulateAsync(
      sourceUri,
      maxWidth < 9000 ? [{ resize: { width: maxWidth } }] : [],
      { compress: q2, format: SaveFormat.JPEG, base64: false },
    );
    outInfo = await FileSystem.getInfoAsync(result.uri);
    outSize = (outInfo as any)?.size ?? 0;
  }

  console.log(`[compressPhoto] AFTER: ${outSize} bytes`);
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    sizeBytes: outSize,
  };
}

export async function compressPhotoForUpload<T>(
  sourceUri: string,
  options: CompressOptions & { uploadFn: (compressedUri: string) => Promise<T> },
): Promise<T> {
  let compressedUri: string | null = null;
  try {
    const result = await compressPhoto(sourceUri, options);
    compressedUri = result.uri;
    return await options.uploadFn(compressedUri);
  } catch (e) {
    console.warn('[compressPhotoForUpload] compression failed, falling back to original', e);
    return await options.uploadFn(sourceUri);
  } finally {
    if (compressedUri) {
      FileSystem.deleteAsync(compressedUri, { idempotent: true }).catch(() => {});
    }
  }
}

/**
 * Stage a compressed photo for offline upload. Copies to documentDirectory
 * so it survives cache clears and app restarts.
 */
export async function stageCompressedPhotoForOffline(
  sourceUri: string,
  profile: CompressionProfile,
): Promise<string> {
  const { uri: compressedUri } = await compressPhoto(sourceUri, { profile });
  const fileName = compressedUri.split('/').pop() ?? `offline_${Date.now()}.jpg`;
  const stagedUri = `${FileSystem.documentDirectory}offline-uploads/${fileName}`;
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}offline-uploads/`, {
    intermediates: true,
  });
  await FileSystem.copyAsync({ from: compressedUri, to: stagedUri });
  // Clean up the cache copy
  FileSystem.deleteAsync(compressedUri, { idempotent: true }).catch(() => {});
  return stagedUri;
}
