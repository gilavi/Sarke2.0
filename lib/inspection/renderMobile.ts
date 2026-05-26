/**
 * Mobile convenience wrapper: resolve an inspection's photos, then render.
 *
 * This is the drop-in replacement for the old async per-type builders
 * (buildExcavatorPdfHtml, buildForkliftPdfHtml, …). Inspection screens call it
 * with { inspection, projectName, signaturesSession }; it resolves photos
 * (base64 on mobile, signed URLs on web) and hands them to the synchronous
 * renderer. `signaturesSession` is the wizard's captured-signature snapshot
 * (RAM-only — see features/signatures/sessionStore) and feeds the unified
 * signatures section at the bottom of every equipment PDF.
 */
import { buildInspectionPdf } from './pdf';
import { resolveInspectionPhotos } from './photos';
import type { SignaturesSectionData } from '../pdf/inspection/renderSignaturesSection';
import type { InspectionSchema } from './schema';

export async function renderInspectionPdf<T>(
  schema: InspectionSchema<T>,
  data: { inspection: T; projectName: string; signaturesSession?: SignaturesSectionData | null },
): Promise<string> {
  const photos = await resolveInspectionPhotos(schema.collectPhotoPaths(data.inspection));
  return buildInspectionPdf(schema, data, photos);
}
