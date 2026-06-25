// Shared types for the reusable DocumentDetails screen.
//
// DocumentDetails is the screen reached by TAPPING A SAVED record in a list
// (NOT the post-save success screen). One presentational shell, four document
// types — only the content + which sections show vary. Each route loads its own
// data and passes the resolved props in, mirroring how FlowSuccessScreen works.
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import type { SignaturesState } from '../../features/signatures';
import type { SuccessParticipant } from '../success/SuccessSignatureSection';
import type { SuccessCertificateItem } from '../success/SuccessCertificateSection';

export type DocumentType = 'act' | 'incident' | 'report' | 'instruction';

/** Status-pill tone. `safe`→success, `severe`→danger, `muted`→neutral. */
export type StatusTone = 'safe' | 'severe' | 'muted';

/** One read-only key/value row in the Info section. */
export interface DocumentInfoRow {
  label: string;
  value: string;
}

/** Signatures section config — editable (act/incident) or view-only (instruction). */
export interface DocumentSignatures {
  mode: 'edit' | 'view';
  /** Editable signing state (edit mode). Mirrors the SignaturesScreen modal. */
  state?: SignaturesState;
  /** Creator's full name (the expert) shown on the creator row. */
  creatorName?: string;
  /** People who already signed during the flow (view mode). */
  participants?: SuccessParticipant[];
}

/** Certificates section config — act only (inspection_attachments). */
export interface DocumentCertificates {
  items: SuccessCertificateItem[];
  onAdd: () => void;
  onOpen: (id: string) => void;
}

export interface DocumentDetailsProps {
  type: DocumentType;
  /** Square tile glyph next to the title. */
  tileIcon: LucideIcon;
  title: string;
  /** Document-type label under the title (e.g. "შემოწმების აქტი"). */
  typeLabel: string;
  /** Status pill; omit or pass `null` to hide (report has none). */
  status?: { tone: StatusTone; label: string } | null;
  /** Read-only key facts (Project + Expert are display-only — see AGENTS.md). */
  info: DocumentInfoRow[];
  /** Section heading + tab label for the type-specific content. */
  contentLabel: string;
  contentTab: string;
  /** Type-specific content body (inspection points / note / slides / topic). */
  children?: ReactNode;
  /** Signatures section; omit or `null` to hide (report). */
  signatures?: DocumentSignatures | null;
  /** Certificates section; omit or `null` to hide (incident/report/instruction). */
  certificates?: DocumentCertificates | null;
  /** Action chips. Delete is rendered in the danger style and should confirm. */
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  editing?: boolean;
  duplicating?: boolean;
  /** Footer primary action — Share PDF. */
  onSharePdf: () => void;
  sharing?: boolean;
  pdfLocked?: boolean;
  /** Top-bar back control (returns to the list). */
  onBack: () => void;
}
