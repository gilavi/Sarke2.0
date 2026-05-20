/**
 * pdf.ts — mobile async wrapper around the shared inspection PDF template.
 *
 * Callers embed photos as base64 data-URIs (via pdfPhotoEmbed / imageUrl.ts)
 * before passing them here. This module no longer contains HTML-building logic;
 * the single source of truth lives in lib/inspectionPdfTemplate.ts.
 */
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  Project,
  Question,
  SignatureRecord,
  Template,
} from '../types/models';
import { buildInspectionPdfTemplate } from './inspectionPdfTemplate';

export type { PdfAttachment } from './inspectionPdfTemplate';
import type { PdfAttachment } from './inspectionPdfTemplate';

/** Shared args for both PDF generation and preview. */
export interface PdfHtmlArgs {
  questionnaire: Inspection;
  template: Template;
  project: Project;
  questions: Question[];
  answers: Answer[];
  signatures: SignatureRecord[];
  photosByAnswer?: Record<string, AnswerPhoto[]>;
  attachments?: PdfAttachment[];
}

export async function buildPdfHtml(args: PdfHtmlArgs): Promise<string> {
  return buildInspectionPdfTemplate({ ...args, mode: 'pdf' });
}

export async function buildPdfPreviewHtml(args: PdfHtmlArgs): Promise<string> {
  return buildInspectionPdfTemplate({ ...args, mode: 'preview' });
}
