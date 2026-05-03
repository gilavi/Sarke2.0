/**
 * Shared helpers for inspection PDF HTML generators.
 *
 * Why this exists: bobcatPdf, excavatorPdf, and generalEquipmentPdf each
 * had byte-identical copies of `fmtDate`, `escHtml`, and the photo-embed
 * loop. The photo loop also lacked path deduplication, so a path that
 * appeared in two items was fetched and embedded twice.
 */

import { pdfPhotoEmbed } from './imageUrl';
import { STORAGE_BUCKETS } from './supabase';

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function escHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Embed a list of photo paths from the answer-photos bucket as resized
 * data URLs keyed by path. Deduplicates paths so the same photo is never
 * fetched twice. Broken paths are silently skipped.
 */
export async function embedInspectionPhotos(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths));
  const out: Record<string, string> = {};
  await Promise.all(
    unique.map(async (p) => {
      try {
        out[p] = await pdfPhotoEmbed(
          STORAGE_BUCKETS.answerPhotos, p, { maxWidth: 400, quality: 0.65 },
        );
      } catch {
        // skip broken photos
      }
    }),
  );
  return out;
}
