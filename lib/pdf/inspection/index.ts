// Inspection PDF template — public barrel.
// One source of truth for the generic inspection PDF HTML, called by both
// the mobile expo-print wrapper (`lib/pdf.ts`) and the web preview pipeline.

export { buildInspectionPdfTemplate } from './template';
export type { PdfAttachment, PdfTemplateArgs } from './template';
export type { SignaturesSectionData } from './renderSignaturesSection';
