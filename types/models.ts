// Domain types mirrored from the Supabase schema.
// See migrations 0001..0006 for the authoritative source.

export type SignerRole = 'expert' | 'xaracho_supervisor' | 'xaracho_assembler' | 'other';

export const SIGNER_ROLE_LABEL: Record<SignerRole, string> = {
  expert: 'შრომის უსაფრთხოების სპეციალისტი',
  xaracho_supervisor: 'ხარაჩოს ზედამხედველი',
  xaracho_assembler: 'ხარაჩოს ამწყობი',
  other: 'სხვა',
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
  /** Backfilled to created_at on the migration that introduced this column. May be absent on rows fetched without it. */
  updated_at?: string;
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
  updated_at?: string;
}

/**
 * Project crew (მონაწილეები) — a flat list of people involved on the
 * project. Editable from both the project screen and the inspection signing
 * flow; both surfaces write back to `projects.crew`.
 *
 * The "inspector" (logged-in expert) is NOT stored here — it's derived from
 * auth and rendered as the first row in the UI. Only `manual` entries live
 * in this array.
 *
 * `signature` is a storage path (same convention as ProjectSigner) and stays
 * null until the member signs in the inspection flow.
 */
/**
 * Identifies which role-slot a crew member fills. The first three mirror
 * `SignerRole`; `other` is a freeform slot whose `role` string is supplied
 * by the user. Legacy rows without a `roleKey` are coerced to `other` at
 * read time (see `mapCrew` in lib/services.real.ts).
 */
export type CrewRoleKey = 'expert' | 'xaracho_supervisor' | 'xaracho_assembler' | 'other';

export const CREW_ROLE_KEYS: CrewRoleKey[] = [
  'expert',
  'xaracho_supervisor',
  'xaracho_assembler',
  'other',
];

export const CREW_ROLE_LABEL: Record<CrewRoleKey, string> = {
  expert: 'შრომის უსაფრთხოების სპეციალისტი',
  xaracho_supervisor: 'ხარაჩოს ზედამხედველი',
  xaracho_assembler: 'ხარაჩოს ამწყობი',
  other: 'სხვა',
};

export interface CrewMember {
  /** Stable client-generated id (uuid). Used for React keys + removal. */
  id: string;
  /** Slot identity. `other` rows carry a custom `role` label. */
  roleKey: CrewRoleKey;
  name: string;
  /** Display label — preset for known keys, custom for `other`. */
  role: string;
  /** Storage path (signatures bucket). Required after save in the slot UX. */
  signature: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  company_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  /** NULL on legacy rows; treat as []. */
  crew: CrewMember[] | null;
  /**
   * Optional project logo as a base64 data URL (e.g. `data:image/jpeg;base64,…`).
   * NULL → render initials avatar instead. Initials are derived from `name`
   * at render time and never stored. See `components/ProjectAvatar.tsx`.
   */
  logo: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  storage_path: string;
  size_bytes: number | null;
  mime_type: string | null;
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
  created_at?: string;
  updated_at?: string;
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
  updated_at?: string;
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
  /** Audit trail — SHA256 hash of device identifier. */
  device_id_hash?: string | null;
  /** Audit trail — geolocation at time of signing. */
  latitude?: number | null;
  longitude?: number | null;
  /** Audit trail — IP address at time of signing. */
  ip_address?: string | null;
}

/**
 * Generated PDF derived from an inspection. One inspection can have many
 * certificates over time (re-generated with different templates/params).
 *
 * `is_safe_for_use` and `conclusion_text` are SNAPSHOTTED at generation
 * time so re-displaying an old certificate doesn't surprise the reader if
 * the underlying inspection row has since been edited.
 */
export interface CertificateParams {
  expertName?: string | null;
  qualTypes?: { type: string; number: string | null }[];
  signerNames?: string[];
}

export interface Certificate {
  id: string;
  inspection_id: string;
  user_id: string;
  template_id: string;
  pdf_url: string;
  is_safe_for_use: boolean | null;
  conclusion_text: string | null;
  /** Template parameters snapshotted at generation time. */
  params: CertificateParams;
  generated_at: string;
}

/**
 * Equipment certificate uploaded against an inspection. The user picks a
 * type chip (or "სხვა") and optionally attaches a number and a 16:9 photo
 * of the physical certificate. Embedded into the generated PDF.
 */
export const ATTACHMENT_TYPE_PRESETS = [
  'ხარაჩოს სერტიფიკატი',
  'ლიფტის სერტიფიკატი',
  'ამწის სერტიფიკატი',
  'ავტომობილის სერტიფიკატი',
  'ხელსაწყოს სერტიფიკატი',
] as const;

export interface InspectionAttachment {
  id: string;
  inspection_id: string;
  user_id: string;
  cert_type: string;
  cert_number: string | null;
  /** Storage path inside the `certificates` bucket. */
  photo_path: string | null;
  created_at: string;
  updated_at: string;
}

// ── Incidents ─────────────────────────────────────────────────────────────────

export type IncidentType = 'minor' | 'severe' | 'fatal' | 'mass' | 'nearmiss';
export type IncidentStatus = 'draft' | 'completed';

/** Short badge label used in list rows and severity chips. */
export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  minor: 'მსუბუქი',
  severe: 'მძიმე',
  fatal: 'ფატალური',
  mass: 'მასობრივი',
  nearmiss: 'საშიში შემთხვევა',
};

/** Full Georgian name used in the PDF and form cards. */
export const INCIDENT_TYPE_FULL_LABEL: Record<IncidentType, string> = {
  minor: 'მსუბუქი უბედური შემთხვევა',
  severe: 'მძიმე უბედური შემთხვევა',
  fatal: 'ფატალური უბედური შემთხვევა',
  mass: 'მასობრივი (3+ დაშავებული)',
  nearmiss: 'საშიში შემთხვევა (near miss — დაზიანება არ მომხდარა)',
};

export interface Incident {
  id: string;
  project_id: string;
  user_id: string;
  type: IncidentType;
  /** null for near-miss (no injured person). */
  injured_name: string | null;
  injured_role: string | null;
  date_time: string;
  location: string;
  description: string;
  cause: string;
  actions_taken: string;
  witnesses: string[];
  /** Storage paths in the `incident-photos` bucket. */
  photos: string[];
  /** Storage path in the `signatures` bucket (inspector's saved signature). */
  inspector_signature: string | null;
  status: IncidentStatus;
  /** Storage path in the `pdfs` bucket. null until generated. */
  pdf_url: string | null;
  created_at: string;
  updated_at?: string;
}

// ── Remote signing ────────────────────────────────────────────────────────────

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
  pdf_signed_url: string | null;
  signature_png_url: string | null;
  signed_at: string | null;
  declined_reason: string | null;
  expires_at: string;
  last_sent_at: string | null;
  created_at: string;
}

// ── Safety Briefing (ინსტრუქტაჟი) ─────────────────────────────────────────────

export interface BriefingParticipant {
  name: string;
  /** Base64 PNG without data: prefix. Null until signed. */
  signature: string | null;
  /** Marked absent during signing; can be revisited from the roster. */
  skipped?: boolean;
}

export type BriefingStatus = 'draft' | 'completed';

export interface Briefing {
  id: string;
  projectId: string;
  /** ISO date-time string. */
  dateTime: string;
  /** Array of topic strings; custom topics prefixed with 'custom:'. */
  topics: string[];
  participants: BriefingParticipant[];
  /** Base64 PNG without data: prefix. */
  inspectorSignature: string | null;
  inspectorName: string;
  status: BriefingStatus;
  createdAt: string;
  updatedAt?: string;
}

// ── Report (რეპორტი) ────────────────────────────────────────────────────────

export type ReportStatus = 'draft' | 'completed';

export interface ReportSlide {
  id: string;
  /** 0-based, used for ordering. */
  order: number;
  title: string;
  description: string;
  /** Storage path in `report-photos` bucket; null when no image picked. */
  image_path: string | null;
  /** Annotated variant; PDF prefers this when set. */
  annotated_image_path: string | null;
}

export interface Report {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  status: ReportStatus;
  slides: ReportSlide[];
  pdf_url: string | null;
  created_at: string;
  updated_at?: string;
}
