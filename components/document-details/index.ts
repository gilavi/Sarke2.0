// components/document-details — the reusable saved-record details screen.
export { DocumentDetails } from './DocumentDetails';
export type {
  DocumentDetailsProps,
  DocumentType,
  DocumentInfoRow,
  DocumentSignatures,
  DocumentCertificates,
  StatusTone,
} from './types';

// Type-specific content bodies (passed as `children` to DocumentDetails).
export { InspectionPointsContent } from './content/InspectionPointsContent';
export { NoteBlocksContent, type NoteBlock } from './content/NoteBlocksContent';
export { ReportSlidesContent } from './content/ReportSlidesContent';
