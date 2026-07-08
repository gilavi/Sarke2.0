// Domain types mirrored from the Supabase schema.
// See migrations 0001..0043 for the authoritative source.

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
 * NOTE: still called `questionnaire_status` in Postgres (enum type) - we
 * didn't rename the enum in 0006 to avoid a schema-ripple. The TS-side
 * alias is the right abstraction from the app's point of view.
 */
export type InspectionStatus = 'draft' | 'completed';

/** @deprecated Use `InspectionStatus`. Kept so legacy imports compile. */
export type QuestionnaireStatus = InspectionStatus;

/**
 * Options for the cross-project "recent records" fetchers — the `recent()`
 * method on inspections / reports / incidents / briefings / orders.
 *
 * `status` pushes an `.eq('status', …)` filter to the DB so completed-only
 * surfaces (Home widgets, History) and draft-only surfaces (the Drafts
 * screen) each fetch exactly their slice instead of over-fetching and
 * slicing client-side. `limit` caps the row count. All five record tables
 * use the same `'draft' | 'completed'` lifecycle, and RLS scopes every read
 * to the signed-in user, so these queries are safe across all projects.
 *
 * `offset` pages past the first `limit` rows (History's infinite scroll —
 * `features/history/useHistoryFeed.ts`): rows `[offset, offset + limit - 1]`
 * via PostgREST `.range()`. Only applied when `limit` is also set; ignored
 * otherwise.
 */
export type RecentRecordsOpts = { limit?: number; offset?: number; status?: InspectionStatus };

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
  /** Number of PDFs generated. Defaults to 0. Added in migration 0028. */
  pdf_count?: number;
  /** Free-tier users are blocked after pdf_count reaches 3. Added in migration 0028. */
  subscription_status?: 'free' | 'active' | 'expired';
  subscription_expires_at?: string | null;
  /** BOG recurring-payment card token for renewals. Added in migration 0028. */
  bog_card_token?: string | null;
}

/**
 * The expert's professional qualification (e.g. xaracho_inspector certificate
 * with number + issue/expiry + photo). Attached to generated certificates as
 * proof of qualification. This is the row formerly known as `Certificate` -
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
 * Project crew (მონაწილეები) - a flat list of people involved on the
 * project. Editable from both the project screen and the inspection signing
 * flow; both surfaces write back to `projects.crew`.
 *
 * The "inspector" (logged-in expert) is NOT stored here - it's derived from
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
  /** Display label - preset for known keys, custom for `other`. */
  role: string;
  /** Storage path (signatures bucket). Required after save in the slot UX. */
  signature: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  company_name: string;
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
  /** Parallel to grid_rows: per-row guidance text shown in ScaffoldRowStep. Null entries = no hint. */
  grid_row_hints?: (string | null)[] | null;
}

/**
 * Immutable record of what happened on site. The data captured here
 * (answers + photos + conclusion + signatures) is the source of truth.
 * A certificate (PDF) is a derived artefact - see `Certificate`.
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
  /** 3-state verdict: 'safe' | 'caution' | 'unsafe'. Null = not yet set. */
  safety_verdict?: 'safe' | 'caution' | 'unsafe' | null;
  conclusion_photo_paths: string[];
  created_at: string;
  updated_at?: string;
  completed_at: string | null;
}

/** @deprecated Use `Inspection`. Kept so legacy imports compile. */
export type Questionnaire = Inspection;

/**
 * Lean calendar-feed projection of an inspection row. `inspectionsApi.listAll`
 * (the calendar/overdue source, unbounded by design — see the comment there)
 * selects only these columns so the full completed history stays cheap to
 * ship and cache; `getById`/`recent` return the full `Inspection` row.
 */
export type CalendarInspectionRow = Pick<
  Inspection,
  'id' | 'project_id' | 'template_id' | 'status' | 'completed_at'
>;

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
  /** `row:<key>` for grid-row photos. Null for all others. */
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
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
      company_name: string;
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
  /** Audit trail - SHA256 hash of device identifier. */
  device_id_hash?: string | null;
  /** Audit trail - geolocation at time of signing. */
  latitude?: number | null;
  longitude?: number | null;
  /** Audit trail - IP address at time of signing. */
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
  safety_verdict?: 'safe' | 'caution' | 'unsafe' | null;
  conclusion_text: string | null;
  /** Template parameters snapshotted at generation time. */
  params: CertificateParams;
  generated_at: string;
  /** SHA-256 hash of the locked PDF. Set after generation for tamper detection. */
  pdf_hash?: string | null;
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
  nearmiss: 'საშიში შემთხვევა (near miss - დაზიანება არ მომხდარა)',
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
  /** SHA-256 hash of the locked PDF. Set after generation for tamper detection. */
  pdf_hash?: string | null;
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
  /**
   * Base64 PNG without data: prefix. Null until signed.
   * List feeds (`briefingsApi.recent/listByProject/listAll`) always return
   * this as null — the `briefings_list_lean` view strips signature payloads.
   * Only `getById` (detail/PDF paths) carries the real payload.
   */
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
  /** Base64 PNG without data: prefix. Null on list feeds (lean view) — only `getById` carries it. */
  inspectorSignature: string | null;
  inspectorName: string;
  status: BriefingStatus;
  createdAt: string;
  updatedAt?: string;
}

// ── Report (რეპორტი) ────────────────────────────────────────────────────────

export type ReportStatus = 'draft' | 'completed';

/**
 * How a slide renders its photo(s) in the app preview + generated PDF. Resolved
 * via `slideLayout()` in `lib/reportSlides.ts`, which falls back to a sensible
 * default for the slide's photo count when unset or invalid.
 *
 * - `text-photo`   — 1 photo: description left, photo right (the historical default).
 * - `photo-full`   — 1 photo: full-width photo, title centered below.
 * - `two-side`     — 2 photos: description on top, two photos side by side.
 * - `two-stacked`  — 2 photos: two photos stacked full-width.
 */
export type ReportSlideLayout = 'text-photo' | 'photo-full' | 'two-side' | 'two-stacked';

/** One photo attached to a report slide. A slide holds up to 2 (see `MAX_SLIDE_PHOTOS`). */
export interface SlideImage {
  /** Storage path in `report-photos` bucket; null when no image picked. */
  image_path: string | null;
  /** Annotated variant; preferred over `image_path` when set. */
  annotated_image_path: string | null;
}

export interface ReportSlide {
  id: string;
  /** 0-based, used for ordering. */
  order: number;
  title: string;
  description: string;
  /**
   * @deprecated Legacy single-photo field — mirror of `images[0].image_path`,
   * kept so older reports and any not-yet-migrated readers keep working. Always
   * read photos through `slideImages()` in `lib/reportSlides.ts`, never these
   * two fields directly.
   */
  image_path: string | null;
  /** @deprecated Legacy single-photo field — mirror of `images[0].annotated_image_path`. */
  annotated_image_path: string | null;
  /**
   * Canonical photo list, 0–2 entries. Optional for back-compat: when absent,
   * `slideImages()` folds the legacy `image_path`/`annotated_image_path` pair
   * into a single-element array. Writers also mirror `images[0]` back into the
   * legacy fields.
   */
  images?: SlideImage[];
  /** Chosen render layout. When unset, `slideLayout()` derives it from photo count. */
  layout?: ReportSlideLayout;
}

export interface Report {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  status: ReportStatus;
  slides: ReportSlide[];
  pdf_url: string | null;
  /** SHA-256 hash of the locked PDF. Set after generation for tamper detection. */
  pdf_hash?: string | null;
  created_at: string;
  updated_at?: string;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface LaborSafetyOrderFormData {
  orderNumber: string;
  city: string;
  orderDate: string;
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  facilityName: string;
  specialistName: string;
  specialistPersonalId: string;
  certificateNumber: string;
  certificateDate: string;
  /** ობიექტის მისამართი — object address (source doc #6). */
  objectAddress: string;
  /** საქმიანობის სფერო — activity field (source doc #6). */
  activityField: string;
  /** Director's base64 signature + extra blank rows are act-style success args. */
  directorSignature?: string | null;
  directorSignedAt?: string | null;
  signatureExtraRows?: number;
}

export interface TrainingScheduleOrderFormData {
  orderDate: string; // ISO
  companyName: string;
  directorName: string;
  directorSignature?: string | null;
  directorSignedAt?: string | null;
  signatureExtraRows?: number;
}

export interface AlcoholControlOrderFormData {
  orderNumber: string;
  city: string;
  orderDate: string;
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  facilityName: string;
  responsiblePersonName: string;
  responsiblePersonPosition: string;
  responsiblePersonPersonalId: string;
}

export interface FireSafetyOrderFormData {
  orderNumber: string;
  city: string;
  orderDate: string; // ISO
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  appointedName: string;
  appointedPhone: string;
  objectName: string;
  objectAddress: string;
  /** base64 PNG, no data: prefix */
  directorSignature: string | null;
  directorSignedAt: string | null;
  /** base64 PNG, no data: prefix */
  appointedSignature: string | null;
  appointedSignedAt: string | null;
  /** Number of extra blank hand-sign slots (act-style success-screen graphs). */
  signatureExtraRows?: number;
}

export interface FireSafetyOrderEnterpriseFormData {
  orderNumber: string;
  city: string;
  orderDate: string; // ISO
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  appointedName: string;
  appointedPhone: string;
  appointedPosition: string;
  appointedIdNumber: string;
  objectName: string;
  objectAddress: string;
  /** base64 PNG, no data: prefix */
  directorSignature: string | null;
  directorSignedAt: string | null;
  /** base64 PNG, no data: prefix */
  appointedSignature: string | null;
  appointedSignedAt: string | null;
}

export interface CraneOperatorOrderFormData {
  orderNumber: string;
  orderDate: string; // ISO
  companyName: string;
  objectAddress: string;
  directorName: string;
  // Appointed operator
  craneOperatorName: string;
  craneOperatorPersonalId: string;
  craneOperatorPosition: string;
  craneOperatorCertNumber: string;
  craneOperatorCertExpiry: string; // ISO
  craneOperatorPhone: string;
  /** Storage path in answer-photos bucket. Optional. */
  craneOperatorCertPhoto: string | null;
  // Crane specs
  craneModel: string;
  craneNumber: string;
  craneMaxLoad: string;
  /** Storage path in answer-photos bucket. Optional. */
  craneInspCertPhoto: string | null;
  /** base64 PNG, no data: prefix. Crane orders no longer capture digital
   *  signatures — these stay null and the PDF prints blank signing lines. */
  directorSignature: string | null;
  directorSignedAt: string | null;
  /** base64 PNG, no data: prefix. See note above. */
  operatorSignature: string | null;
  operatorSignedAt: string | null;
  /** Number of extra blank hand-sign slots to print below the director +
   *  operator blocks (mirrors the inspection "add line" flow). */
  signatureExtraRows?: number;
}

export interface CraneTechnicalOrderFormData {
  orderNumber: string;
  orderDate: string;
  companyName: string;
  objectAddress: string;
  directorName: string;
  craneOperatorName: string;
  craneOperatorPersonalId: string;
  /** "კვალიფიკაცია / სპეციალობა" - differs from CraneOperatorOrderFormData's craneOperatorPosition */
  craneOperatorQualification: string;
  craneOperatorCertNumber: string;
  craneOperatorCertExpiry: string;
  craneOperatorPhone: string;
  craneOperatorCertPhoto: string | null;
  craneModel: string;
  craneNumber: string;
  craneMaxLoad: string;
  craneInspCertPhoto: string | null;
  directorSignature: string | null;
  directorSignedAt: string | null;
  operatorSignature: string | null;
  operatorSignedAt: string | null;
  /** Number of extra blank hand-sign slots to print (see CraneOperatorOrderFormData). */
  signatureExtraRows?: number;
}

export interface ScaffoldSupervisionOrderFormData {
  orderNumber: string;
  city: string;
  orderDate: string; // ISO
  companyName: string;
  objectAddress: string;
  directorName: string;
  // Appointed scaffolding supervisor — name, position, phone only (no ID/cert).
  appointedName: string;
  appointedPosition: string;
  appointedPhone: string;
  directorSignature: string | null;
  directorSignedAt: string | null;
  appointedSignature: string | null;
  appointedSignedAt: string | null;
  /** Number of extra blank hand-sign slots (success-screen graphs). */
  signatureExtraRows?: number;
}

export type OrderFormData = LaborSafetyOrderFormData | AlcoholControlOrderFormData | FireSafetyOrderFormData | FireSafetyOrderEnterpriseFormData | CraneOperatorOrderFormData | CraneTechnicalOrderFormData | ScaffoldSupervisionOrderFormData | TrainingScheduleOrderFormData;

export type OrderDocumentType = 'labor_safety_specialist' | 'alcohol_control' | 'fire_safety_order' | 'fire_safety_order_enterprise' | 'crane_operator_order' | 'crane_technical_order' | 'scaffold_supervision_order' | 'training_schedule_order';

export interface Order {
  id: string;
  projectId: string;
  userId: string;
  documentType: OrderDocumentType;
  /**
   * List feeds (`ordersApi.recent/listByProject`) strip the base64 signature
   * keys (`directorSignature` / `appointedSignature` / `operatorSignature`)
   * via the `orders_list_lean` view; every other form field survives. Read
   * signatures through `getById` (edit/detail/PDF paths) only.
   */
  formData: OrderFormData;
  status: 'draft' | 'completed';
  pdfUrl: string | null;
  /** SHA-256 hash of the locked PDF. Set after generation for tamper detection. */
  pdfHash?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ORDER_DOCUMENT_TYPE_LABEL: Record<OrderDocumentType, string> = {
  labor_safety_specialist: 'შრომის უსაფრთხოების სპეციალისტის დანიშვნა',
  alcohol_control: 'ალკოჰოლური და ნარკოტიკული თრობის კონტროლი',
  fire_safety_order: 'სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა',
  fire_safety_order_enterprise: 'საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა',
  crane_operator_order: 'კოშკურა ამწის ოპერატორის დანიშვნა',
  crane_technical_order: 'ამწის ტექ. გამართულობა',
  scaffold_supervision_order: 'ხარაჩოს ზედამხედველი პირის დანიშვნა',
  training_schedule_order: 'სწავლება-ინსტრუქტაჟის გეგმა-გრაფიკი',
};

/** A BOG payment callback row. Added in migration 0031. */
export interface PaymentRecord {
  id: string;
  user_id: string;
  bog_order_id: string;
  amount: number | null;
  currency: string | null;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  created_at: string;
}

