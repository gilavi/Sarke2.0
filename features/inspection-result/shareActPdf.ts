// shareActPdf — the single owner of the inspection-act "Share PDF" path, used
// by BOTH the act success screen (/inspections/[id]/done) and the act details
// screen (/inspections/[id]). It re-embeds photos + certificate images fresh,
// builds the act HTML, and shares it through expo-print.
//
// REGULATORY: the captured signature arrives as a local in-memory snapshot
// (`signaturesSession`) and is only rasterized into the PDF — never persisted.
// See features/signatures/AGENTS.md. This helper does no persistence.
import { buildPdfHtml, type PdfAttachment } from '../../lib/pdf';
import type { SignaturesSectionData } from '../../lib/pdf/inspection';
import { generateAndSharePdf } from '../../lib/pdfOpen';
import { generatePdfName } from '../../lib/pdfName';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { pdfPhotoEmbed, imageForDisplay } from '../../lib/imageUrl';
import { toErrorMessage } from '../../lib/logError';
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  InspectionAttachment,
  Project,
  Question,
  Template,
} from '../../types/models';

export interface ShareActPdfArgs {
  inspection: Inspection;
  template: Template;
  project: Project;
  questions: Question[];
  answers: Answer[];
  photosByAnswer: Record<string, AnswerPhoto[]>;
  attachments: InspectionAttachment[];
  signaturesSession: SignaturesSectionData | null;
  userId?: string;
  authorName: string;
  /** Localized message for the outer 30s timeout guard. */
  timeoutMessage: string;
}

/**
 * Build + share the act PDF. Throws on failure (including PdfLimitReachedError
 * from the underlying generator and the 30s timeout) — the caller maps those to
 * the limit notice / a toast.
 */
export async function shareActPdf(args: ShareActPdfArgs): Promise<void> {
  const { inspection, template, project, questions, answers } = args;

  // Re-embed photos fresh — signatures or attachments may have changed since
  // the screen opened.
  const photosEmbedded: Record<string, AnswerPhoto[]> = {};
  await Promise.all(
    Object.entries(args.photosByAnswer).map(async ([answerId, photos]) => {
      photosEmbedded[answerId] = await Promise.all(
        photos.map(async (p) => {
          if (p.storage_path.startsWith('data:') || p.storage_path.startsWith('file:')) return p;
          try {
            const dataUrl = await pdfPhotoEmbed(STORAGE_BUCKETS.answerPhotos, p.storage_path);
            return { ...p, storage_path: dataUrl };
          } catch {
            return p;
          }
        }),
      );
    }),
  );

  const attsEmbedded: PdfAttachment[] = await Promise.all(
    args.attachments.map(async (a) => {
      if (!a.photo_path) return { ...a };
      if (a.photo_path.startsWith('data:') || a.photo_path.startsWith('file:')) {
        return { ...a, photo_data_url: a.photo_path };
      }
      try {
        const dataUrl = await pdfPhotoEmbed(STORAGE_BUCKETS.certificates, a.photo_path);
        return { ...a, photo_data_url: dataUrl };
      } catch (e) {
        console.warn('[act.cert] embed failed, falling back to URL:', a.photo_path, toErrorMessage(e));
        try {
          const url = await imageForDisplay(STORAGE_BUCKETS.certificates, a.photo_path);
          return { ...a, photo_data_url: url };
        } catch {
          return { ...a };
        }
      }
    }),
  );

  const html = await buildPdfHtml({
    questionnaire: inspection,
    template,
    project,
    questions,
    answers,
    signaturesSession: args.signaturesSession,
    photosByAnswer: photosEmbedded,
    attachments: attsEmbedded,
  });

  const filename = generatePdfName(
    project.company_name || project.name,
    template.category === 'harness' ? 'aprzhilebis_shemowmeba' : 'kharachos_shemowmeba',
    new Date(inspection.created_at),
    inspection.id,
  );

  const pdfPromise = generateAndSharePdf(html, filename, false, args.userId, {
    title: template.name,
    author: args.authorName || undefined,
    documentId: inspection.id,
    subject: 'შრომის უსაფრთხოების შემოწმება',
  });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(args.timeoutMessage)), 30_000),
  );
  await Promise.race([pdfPromise, timeoutPromise]);
}
