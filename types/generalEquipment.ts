// General equipment inspection — ტექნიკური აღჭურვილობის შემოწმების აქტი
//
// Flexible / custom template: no predefined checklist items.
// The user builds their own equipment list row-by-row.
// DB-backed by `general_equipment_inspections` table (migration 0027).

export type GECondition    = 'good' | 'needs_service' | 'unusable' | null;
export type GEInspectionType = 'initial' | 'repeat' | 'scheduled';
export type GESignerRole   = 'electrician' | 'technician' | 'safety_specialist' | 'other';

export const GENERAL_EQUIPMENT_TEMPLATE_ID = '66666666-6666-6666-6666-666666666666';

// ── Equipment row ─────────────────────────────────────────────────────────────

export interface EquipmentItem {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  condition: GECondition;
  note: string | null;
  photo_paths: string[];
}

// ── Inspection model ──────────────────────────────────────────────────────────

export interface GeneralEquipmentInspection {
  id: string;
  projectId: string;
  templateId: string;
  userId: string;
  status: 'draft' | 'completed';

  // Section I — general info
  objectName: string | null;
  address: string | null;
  activityType: string | null;
  inspectionDate: string;    // ISO date "YYYY-MM-DD"
  actNumber: string | null;
  inspectionType: GEInspectionType | null;
  inspectorName: string | null;

  // Section II — equipment
  equipment: EquipmentItem[];

  // Section III — summary
  conclusion: string | null;
  summaryPhotos: string[];   // storage paths in answer-photos bucket

  // Section IV — signature
  signerName: string | null;
  signerRole: GESignerRole | null;
  signerRoleCustom: string | null;
  inspectorSignature: string | null; // base64 PNG without data: prefix

  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Labels ────────────────────────────────────────────────────────────────────

export const INSPECTION_TYPE_LABEL: Record<GEInspectionType, string> = {
  initial:   'პირველადი',
  repeat:    'განმეორებითი',
  scheduled: 'გეგმური',
};

export const SIGNER_ROLE_LABEL: Record<GESignerRole, string> = {
  electrician:       'ელექტრიკი',
  technician:        'ტექნიკოსი',
  safety_specialist: 'შრომის უსაფრთხ. სპეც.',
  other:             'სხვა',
};

export const SIGNER_ROLE_LABEL_FULL: Record<GESignerRole, string> = {
  electrician:       'ელექტრიკი',
  technician:        'ტექნიკოსი',
  safety_specialist: 'შრომის უსაფრთხოების სპეციალისტი',
  other:             'სხვა',
};

export const CONDITION_LABEL: Record<NonNullable<GECondition>, string> = {
  good:          '✓ კარგი',
  needs_service: '⚠ საჭ. მომს.',
  unusable:      '✗ გამოუს.',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

let _counter = 0;

/** Synchronous unique ID for a new equipment row. */
function newRowId(): string {
  return `row_${Date.now()}_${++_counter}`;
}

/** Build a single blank equipment row. */
export function buildDefaultEquipmentRow(): EquipmentItem {
  return {
    id:           newRowId(),
    name:         '',
    model:        '',
    serialNumber: '',
    condition:    null,
    note:         null,
    photo_paths:  [],
  };
}

/** Build the 3 default blank rows shown when a new inspection is created. */
export function buildDefaultEquipment(): EquipmentItem[] {
  return [buildDefaultEquipmentRow(), buildDefaultEquipmentRow(), buildDefaultEquipmentRow()];
}

/** Resolve the displayed position string for the signature block. */
export function resolveSignerPosition(
  role: GESignerRole | null,
  custom: string | null,
): string {
  if (!role) return '—';
  if (role === 'other') return custom?.trim() || 'სხვა';
  return SIGNER_ROLE_LABEL_FULL[role];
}
