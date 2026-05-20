import { makeInspectionService } from './inspection/service';
import type {
  GeneralEquipmentInspection,
  EquipmentItem,
  GEInspectionType,
  GESignerRole,
} from '../types/generalEquipment';
import { buildDefaultEquipment } from '../types/generalEquipment';

// ── DB ↔ model mapping ────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: string;
  object_name: string | null;
  address: string | null;
  activity_type: string | null;
  inspection_date: string;
  act_number: string | null;
  inspection_type: string | null;
  inspector_name: string | null;
  equipment: EquipmentItem[];
  conclusion: string | null;
  summary_photos: string[];
  signer_name: string | null;
  signer_role: string | null;
  signer_role_custom: string | null;
  inspector_signature: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): GeneralEquipmentInspection {
  return {
    id:                 row.id,
    projectId:          row.project_id,
    templateId:         row.template_id ?? '',
    userId:             row.user_id,
    status:             row.status as GeneralEquipmentInspection['status'],
    objectName:         row.object_name,
    address:            row.address,
    activityType:       row.activity_type,
    inspectionDate:     row.inspection_date,
    actNumber:          row.act_number,
    inspectionType:     (row.inspection_type ?? null) as GEInspectionType | null,
    inspectorName:      row.inspector_name,
    equipment:          Array.isArray(row.equipment) && row.equipment.length > 0
                          ? row.equipment
                          : buildDefaultEquipment(),
    conclusion:         row.conclusion,
    summaryPhotos:      Array.isArray(row.summary_photos) ? row.summary_photos : [],
    signerName:         row.signer_name,
    signerRole:         (row.signer_role ?? null) as GESignerRole | null,
    signerRoleCustom:   row.signer_role_custom,
    inspectorSignature: row.inspector_signature,
    completedAt:        row.completed_at,
    createdAt:          row.created_at,
    updatedAt:          row.updated_at,
  };
}

// signer fields / inspectorSignature are ephemeral (memory-only) — never
// persisted via patch.
type GeneralEquipmentPatch = Partial<{
  objectName: string | null;
  address: string | null;
  activityType: string | null;
  inspectionDate: string;
  actNumber: string | null;
  inspectionType: GEInspectionType | null;
  inspectorName: string | null;
  equipment: EquipmentItem[];
  conclusion: string | null;
  summaryPhotos: string[];
  signerName: string | null;
  signerRole: GESignerRole | null;
  signerRoleCustom: string | null;
  inspectorSignature: string | null;
}>;

function toDb(patch: GeneralEquipmentPatch): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if ('objectName'         in patch) db.object_name     = patch.objectName;
  if ('address'            in patch) db.address         = patch.address;
  if ('activityType'       in patch) db.activity_type   = patch.activityType;
  if ('inspectionDate'     in patch) db.inspection_date = patch.inspectionDate;
  if ('actNumber'          in patch) db.act_number      = patch.actNumber;
  if ('inspectionType'     in patch) db.inspection_type = patch.inspectionType;
  if ('inspectorName'      in patch) db.inspector_name  = patch.inspectorName;
  if ('equipment'          in patch) db.equipment       = patch.equipment;
  if ('conclusion'         in patch) db.conclusion      = patch.conclusion;
  if ('summaryPhotos'      in patch) db.summary_photos  = patch.summaryPhotos;
  return db;
}

// ── API ───────────────────────────────────────────────────────────────────────

const base = makeInspectionService<GeneralEquipmentInspection, GeneralEquipmentPatch>({
  table: 'general_equipment_inspections',
  pathPrefix: 'general_equipment',
  toModel,
  toDb,
  createColumns: (args) => {
    const ts = Date.now().toString(36).slice(-4).toUpperCase();
    const actNumber = `GEI-${new Date().getFullYear()}-${ts}`;
    return {
      inspector_name: args.inspectorName ?? null,
      act_number: actNumber,
      equipment: buildDefaultEquipment(),
      summary_photos: [],
    };
  },
});

export const generalEquipmentApi = {
  create: base.create,
  getById: base.getById,
  listByProject: base.listByProject,
  patch: base.patch,
  complete: base.complete,
  deletePhoto: base.deletePhoto,
  uploadPhoto: (inspectionId: string, context: 'equipment' | 'summary', itemId: string, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/${context}/${itemId}`, photoUri),
};
