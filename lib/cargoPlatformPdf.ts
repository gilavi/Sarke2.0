/**
 * Mobile wrapper for the cargo-platform PDF generator.
 *
 * Fetches all inspection photos as base64 data URIs (needed for expo-print /
 * offline rendering), then delegates to the shared template in
 * cargoPlatformPdfTemplate.ts.
 *
 * Call `generateAndSharePdf` from `lib/pdfOpen.ts` with the returned HTML.
 */

import { embedInspectionPhotos } from './pdfShared';
import { buildCargoPlatformPdfTemplate } from './cargoPlatformPdfTemplate';
import type { CargoPlatformInspection } from '../types/cargoPlatform';

export async function buildCargoPlatformPdfHtml(args: {
  inspection: CargoPlatformInspection;
  projectName?: string;
}): Promise<string> {
  const { inspection } = args;
  const allPaths = [
    ...inspection.items.flatMap(i => i.photo_paths ?? []),
    ...inspection.summaryPhotos,
  ];
  const photoUrls = await embedInspectionPhotos(allPaths);
  return buildCargoPlatformPdfTemplate({ ...args, photoUrls });
}
