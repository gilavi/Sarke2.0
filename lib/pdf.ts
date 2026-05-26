/**
 * pdf.ts — mobile async wrapper around the shared inspection PDF template.
 *
 * Callers embed photos as base64 data-URIs (via pdfPhotoEmbed / imageUrl.ts)
 * before passing them here. They also read the captured signatures snapshot
 * from features/signatures/sessionStore and pass it through as
 * `signaturesSession` — the wizard captures, the result screen renders, and
 * the snapshot is cleared after the PDF is generated. No persistence path.
 */
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  Project,
  Question,
  Template,
} from '../types/models';
import { buildInspectionPdfTemplate } from './inspectionPdfTemplate';
import type { SignaturesSectionData } from './pdf/inspection/renderSignaturesSection';

export type { PdfAttachment } from './inspectionPdfTemplate';
import type { PdfAttachment } from './inspectionPdfTemplate';

/** Shared args for both PDF generation and preview. */
export interface PdfHtmlArgs {
  questionnaire: Inspection;
  template: Template;
  project: Project;
  questions: Question[];
  answers: Answer[];
  /** Captured creator signature + additional-row count snapshot. `null` or
   *  absent skips the signatures section entirely. */
  signaturesSession?: SignaturesSectionData | null;
  photosByAnswer?: Record<string, AnswerPhoto[]>;
  attachments?: PdfAttachment[];
}

export async function buildPdfHtml(args: PdfHtmlArgs): Promise<string> {
  return buildInspectionPdfTemplate({ ...args, mode: 'pdf' });
}

export async function buildPdfPreviewHtml(args: PdfHtmlArgs): Promise<string> {
  return buildInspectionPdfTemplate({ ...args, mode: 'preview' });
}
