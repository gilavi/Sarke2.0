/**
 * Cross-platform photo resolution for inspection PDFs.
 *
 * The PDF HTML builder (lib/inspection/pdf.ts) is synchronous and platform-free:
 * it receives already-resolved image URLs. This module produces that map.
 *
 * Why it exists: the per-equipment PDF builders each embedded photos *inside*
 * the (async) builder via pdfShared's mobile-only embed helper, which only ever
 * produced mobile base64 data URLs - so equipment PDFs rendered blank images on
 * the web dashboard. Resolving here, keyed by platform, fixes that class of bug
 * once for every inspection type.
 *
 *   mobile → base64 data URL (resized + on-disk cached; WKWebView can't fetch
 *            Supabase URLs at print time)
 *   web    → signed HTTPS URL (the browser fetches it directly)
 */
import { Platform } from 'react-native';
import { pdfPhotoEmbed, imageForDisplay } from '../imageUrl';
import { STORAGE_BUCKETS } from '../supabase';
import type { PhotoMap } from './schema';

export type { PhotoMap };

// Match the resize/quality the equipment family used in pdfShared.embedInspectionPhotos.
const PDF_ITEM_PHOTO_MAX_WIDTH = 400;
const PDF_ITEM_PHOTO_QUALITY = 0.65;

/**
 * Resolve a list of answer-photo storage paths to renderable URLs.
 * Deduplicates paths, resolves in parallel, and silently drops broken paths
 * (a missing photo must never block PDF generation).
 */
export async function resolveInspectionPhotos(paths: string[]): Promise<PhotoMap> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  const out: PhotoMap = {};
  await Promise.all(
    unique.map(async (p) => {
      try {
        out[p] =
          Platform.OS === 'web'
            ? await imageForDisplay(STORAGE_BUCKETS.answerPhotos, p)
            : await pdfPhotoEmbed(STORAGE_BUCKETS.answerPhotos, p, {
                maxWidth: PDF_ITEM_PHOTO_MAX_WIDTH,
                quality: PDF_ITEM_PHOTO_QUALITY,
              });
      } catch {
        // Broken/missing photo - skip; the renderer shows a placeholder.
      }
    }),
  );
  return out;
}
