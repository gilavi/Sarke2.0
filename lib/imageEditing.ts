// Canonical owner for in-app image transforms (crop / rotate / EXIF-normalize).
//
// Wraps expo-image-manipulator's legacy `manipulateAsync` so the photo editor
// never reaches for the manipulator API directly (mirrors lib/photoCompression.ts).
// Resizing/compression for upload lives in lib/photoCompression.ts — this file is
// only the geometric edits the user drives in the annotator.

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface PixelRect {
  /** Left edge in SOURCE pixels (top-left origin). */
  originX: number;
  /** Top edge in source pixels. */
  originY: number;
  /** Crop width in source pixels. */
  width: number;
  /** Crop height in source pixels. */
  height: number;
}

export interface EditedImage {
  uri: string;
  /** Pixel width of the result (post-transform — swaps on 90°/270° rotate). */
  width: number;
  /** Pixel height of the result. */
  height: number;
}

/**
 * Crop `uri` to a source-pixel rectangle. `rect` must be integers fully inside
 * the image (see cropGeometry.displayRectToPixels, which rounds then clamps).
 * Encodes at max quality — the upload-time resize/compress happens later.
 */
export async function cropImage(uri: string, rect: PixelRect): Promise<EditedImage> {
  const r = await manipulateAsync(uri, [{ crop: rect }], { compress: 1, format: SaveFormat.JPEG });
  return { uri: r.uri, width: r.width, height: r.height };
}

/**
 * Rotate `uri` clockwise by `deg` (use 90 for the quarter-turn button). The
 * returned width/height reflect the post-rotation dimensions (swapped at 90/270),
 * so trust them over any pre-rotate measurement.
 */
export async function rotateImage(uri: string, deg: number): Promise<EditedImage> {
  const r = await manipulateAsync(uri, [{ rotate: deg }], { compress: 1, format: SaveFormat.JPEG });
  return { uri: r.uri, width: r.width, height: r.height };
}

/**
 * Bake EXIF orientation into the pixels (so `Image.getSize` display dims and the
 * source pixel grid agree) and materialize a remote URI (e.g. a signed Supabase
 * URL from re-annotate) to a local file. Run once before any crop math.
 *
 * Best-effort: on failure (offline, unreachable URL) it returns the original URI
 * with `width/height: 0` so the caller falls back to `Image.getSize` — the edit
 * still proceeds, just without the EXIF guarantee, like compressPhotoForUpload's
 * fallback.
 */
export async function normalizeImage(uri: string): Promise<EditedImage> {
  try {
    const r = await manipulateAsync(uri, [], { compress: 1, format: SaveFormat.JPEG });
    return { uri: r.uri, width: r.width, height: r.height };
  } catch (e) {
    console.warn('[normalizeImage] failed, using original uri', e);
    return { uri, width: 0, height: 0 };
  }
}
