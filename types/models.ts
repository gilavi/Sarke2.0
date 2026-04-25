// Domain types mirrored from the Supabase schema.
// See migrations 0001..0006 for the authoritative source.

export type SignerRole = 'expert' | 'xaracho_supervisor' | 'xaracho_assembler';

export const SIGNER_ROLE_LABEL: Record<SignerRole, string> = {
  expert: 'შრომის უსაფრთხოების სპეციალისტი',
  xaracho_supervisor: 'ხარაჩოს ზედამხედველი',
  xaracho_assembler: 'ხარაჩოს ამწყობი',
};

export type QuestionType =
  | 'yesno'
  | 'measure'
  | 'component_grid'
  | 'freetext'
  | 'photo_upload';

/**
 * Inspection lifecycle status.
 *
 * NOTE: still called `questionnaire_status` in Postgres (enum type) — we
 * didn't rename the enum in 0006 to avoid a schema-ripple. The TS-side
 * alias is the right abstraction from the app's point of view.
 */
export type InspectionStatus = 'draft' | 'completed';

/** @deprecated Use `InspectionStatus`. Kept so legacy imports compile. */
export type QuestionnaireStatus = InspectionStatus;

export interface AppUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  tc_accepted_version: string | null;
  tc_accepted_at: string | null;
  saved_signature_url: string | null;
}

/**
 * The expert's professional qualification (e.g. xaracho_inspector certificate
 * with number + issue/expiry + photo). Attached to generated certificates as
 * proof of qualification. This is the row formerly known as `Certificate` —
 * renamed in 0006 to free up that name for the PDF-output concept.
 */
export interface Qualification {
  id: string;
  user_id: string;
  type: string;
  number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  file_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  company_name: string | null;
  address: string | null;
  created_at: string;
}

export interface ProjectSigner {
  id: string;
  project_id: string;
  role: SignerRole;
  full_name: string;
  phone: string | null;
  position: string | null;
  signature_png_url: string | null;
}

export interface Template {
  id: string;
  owner_id: string | null;
  name: string;
  category: string | null;
  is_system: boolean;
  /**
   * `qualifications.type` values the template requires (e.g.
   * `['xaracho_inspector']`). Renamed from `required_cert_types` in 0007.
   */
  required_qualifications: string[];
  required_signer_roles: SignerRole[];
}

export interface Question {
  id: string;
  template_id: string;
  section: number;
  order: number;
  type: QuestionType;
  title: string;
  min_val: number | null;
  max_val: number | null;
  unit: string | null;
  grid_rows: string[] | null;
  grid_cols: string[] | null;
}

/**
 * Immutable record of what happened on site. The data captured here
 * (answers + photos + conclusion + signatures) is the source of truth.
 * A certificate (PDF) is a derived artefact — see `Certificate`.
 */
export interface Inspection {
  id: string;
  project_id: string;
  project_item_id: string | null;
  template_id: string;
  user_id: string;
  status: InspectionStatus;
  harness_name: string | null;
  conclusion_text: string | null;
  is_safe_for_use: boolean | null;
  created_at: string;
  completed_at: string | null;
}

/** @deprecated Use `Inspection`. Kept so legacy imports compile. */
export type Questionnaire = Inspection;

export type GridValues = Record<string, Record<string, string>>;

export interface Answer {
  id: string;
  inspection_id: string;
  question_id: string;
  value_bool: boolean | null;
  value_num: number | null;
  value_text: string | null;
  grid_values: GridValues | null;
  comment: string | null;
  notes: string | null;
}

export interface AnswerPhoto {
  id: string;
  answer_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface Schedule {
  id: string;
  project_item_id: string;
  last_inspected_at: string | null;
  next_due_at: string | null;
  interval_days: number;
  google_event_id: string | null;
  created_at: string;
}

/**
 * Schedule with its parent project_item + project joined in, shaped to
 * match the Supabase select used by schedulesApi (nested relations).
 */
export interface ScheduleWithItem extends Schedule {
  project_items: {
    id: string;
    name: string;
    project_id: string;
    projects: {
      id: string;
      name: string;
      company_name: string | null;
    } | null;
  } | null;
}

export type SignatureStatus = 'signed' | 'not_present';

export interface SignatureRecord {
  id: string;
  inspection_id: string;
  signer_role: SignerRole;
  full_name: string;
  phone: string | null;
  position: string | null;
  /** NULL when status === 'not_present'. */
  signature_png_url: string | null;
  signed_at: string;
  status: SignatureStatus;
  /** Ad-hoc name for signers not tied to a project_signers row. */
  person_name: string | null;
}

/**
 * Generated PDF derived from an inspection. One inspection can have many
 * certificates over time (re-generated with different templates/params).
 *
 * `is_safe_for_use` and `conclusion_text` are SNAPSHOTTED at generation
 * time so re-displaying an old certificate doesn't surprise the reader if
 * the underlying inspection row has since been edited.
 */
export interface Certificate {
  id: string;
  inspection_id: string;
  user_id: string;
  template_id: string;
  pdf_url: string;
  is_safe_for_use: boolean | null;
  conclusion_text: string | null;
  /** Arbitrary template parameters captured at generation time. */
  params: Record<string, unknown>;
  generated_at: string;
}

/**
 * Asynchronous signature collection from a remote signer.
 *
 * Lifecycle: pending → sent (after expert opens iOS Messages) →
 * signed | declined | expired. Hard-deleted only when the expert cancels
 * while still pending/sent. See migration 0011_remote_signing.sql.
 */
export type RemoteSigningStatus =
  | 'pending'
  | 'sent'
  | 'signed'
  | 'declined'
  | 'expired';

export interface RemoteSigningRequest {
  id: string;
  token: string;
  inspection_id: string;
  expert_user_id: string;
  signer_name: string;
  signer_phone: string;
  signer_role: SignerRole;
  status: RemoteSigningStatus;
  /** 14-day signed URL minted at create-time so the anon web client can fetch the PDF. */
  pdf_signed_url: string | null;
  /** Storage path under remote-signatures/<token>/ once signed. */
  signature_png_url: string | null;
  signed_at: string | null;
  declined_reason: string | null;
  expires_at: string;
  last_sent_at: string | null;
  created_at: string;
}
