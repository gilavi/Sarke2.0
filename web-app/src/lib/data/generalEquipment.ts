import { makeRepository, mapDefined } from '@/lib/db/repository';
import type { SignatoryEntry } from '@/lib/data/inspections';

export const GENERAL_EQUIPMENT_TEMPLATE_ID = '66666666-6666-6666-6666-666666666666';

export type GECondition = 'good' | 'needs_service' | 'unusable';
export type GEInspectionType = 'initial' | 'repeat' | 'scheduled';
export type GESignerRole = 'electrician' | 'technician' | 'safety_specialist' | 'other';

export interface GEEquipmentRow {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  condition: GECondition | null;
  note: string;
  photo_paths: string[];
}

export interface GeneralEquipmentInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  objectName: string | null;
  address: string | null;
  activityType: string | null;
  inspectionDate: string;
  actNumber: string | null;
  inspectionType: GEInspectionType | null;
  department: string | null;
  inspectorName: string | null;
  equipment: GEEquipmentRow[];
  conclusion: string | null;
  signerName: string | null;
  signerRole: GESignerRole | null;
  signerRoleCustom: string | null;
  inspectorSignature: string | null;
  signatories: SignatoryEntry[];
  summaryPhotos: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbRow {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: 'draft' | 'completed';
  object_name: string | null;
  address: string | null;
  activity_type: string | null;
  inspection_date: string;
  act_number: string | null;
  inspection_type: GEInspectionType | null;
  department: string | null;
  inspector_name: string | null;
  equipment: GEEquipmentRow[] | null;
  conclusion: string | null;
  signer_name: string | null;
  signer_role: GESignerRole | null;
  signer_role_custom: string | null;
  inspector_signature: string | null;
  signatories: SignatoryEntry[] | null;
  summary_photos: string[] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, object_name, address, activity_type, inspection_date, act_number, inspection_type, department, inspector_name, equipment, conclusion, signer_name, signer_role, signer_role_custom, summary_photos, completed_at, created_at, updated_at';

function toModel(r: DbRow): GeneralEquipmentInspection {
  return {
    id: r.id,
    projectId: r.project_id,
    templateId: r.template_id,
    userId: r.user_id,
    status: r.status,
    objectName: r.object_name,
    address: r.address,
    activityType: r.activity_type,
    inspectionDate: r.inspection_date,
    actNumber: r.act_number,
    inspectionType: r.inspection_type,
    department: r.department,
    inspectorName: r.inspector_name,
    equipment: r.equipment ?? [],
    conclusion: r.conclusion,
    signerName: r.signer_name,
    signerRole: r.signer_role,
    signerRoleCustom: r.signer_role_custom,
    inspectorSignature: null,
    signatories: [],
    summaryPhotos: r.summary_photos ?? [],
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface CreateGeneralEquipmentArgs {
  projectId: string;
  objectName?: string | null;
  activityType?: string | null;
  inspectionType?: GEInspectionType | null;
  department?: string | null;
  inspectorName?: string | null;
  actNumber?: string | null;
  inspectionDate?: string | null;
}

export type GeneralEquipmentPatch = Partial<{
  objectName: string | null;
  address: string | null;
  activityType: string | null;
  actNumber: string | null;
  inspectionType: GEInspectionType | null;
  inspectionDate: string | null;
  department: string | null;
  inspectorName: string | null;
  equipment: GEEquipmentRow[];
  conclusion: string | null;
  signerName: string | null;
  signerRole: GESignerRole | null;
  signerRoleCustom: string | null;
  inspectorSignature: string | null;
  signatories: SignatoryEntry[];
  summaryPhotos: string[];
  status: 'draft' | 'completed';
}>;

const repo = makeRepository<
  GeneralEquipmentInspection,
  DbRow,
  CreateGeneralEquipmentArgs,
  GeneralEquipmentPatch
>({
  table: 'general_equipment_inspections',
  columns: COLS,
  parentInspection: { type: 'general_equipment' },
  toModel,
  toInsert: (args, userId) => ({
    project_id: args.projectId,
    template_id: GENERAL_EQUIPMENT_TEMPLATE_ID,
    user_id: userId,
    status: 'draft',
    object_name: args.objectName ?? null,
    activity_type: args.activityType ?? null,
    inspection_type: args.inspectionType ?? null,
    department: args.department ?? null,
    inspector_name: args.inspectorName ?? null,
    act_number: args.actNumber ?? null,
    ...(args.inspectionDate ? { inspection_date: args.inspectionDate } : {}),
    equipment: [],
  }),
  toUpdate: (patch) => {
    const row = mapDefined(patch, {
      objectName: 'object_name',
      address: 'address',
      activityType: 'activity_type',
      actNumber: 'act_number',
      inspectionType: 'inspection_type',
      inspectionDate: 'inspection_date',
      department: 'department',
      inspectorName: 'inspector_name',
      equipment: 'equipment',
      conclusion: 'conclusion',
      signerName: 'signer_name',
      signerRole: 'signer_role',
      signerRoleCustom: 'signer_role_custom',
      summaryPhotos: 'summary_photos',
    });
    if (patch.status !== undefined) {
      row.status = patch.status;
      if (patch.status === 'completed') row.completed_at = new Date().toISOString();
    }
    return row;
  },
});

export const listGeneralEquipmentInspections = (
  projectId?: string,
): Promise<GeneralEquipmentInspection[]> => repo.list(projectId);
export const getGeneralEquipmentInspection = (
  id: string,
): Promise<GeneralEquipmentInspection | null> => repo.get(id);
export const createGeneralEquipmentInspection = (
  args: CreateGeneralEquipmentArgs,
): Promise<GeneralEquipmentInspection> => repo.create(args);
export const updateGeneralEquipmentInspection = (
  id: string,
  patch: GeneralEquipmentPatch,
): Promise<void> => repo.update(id, patch);
export const deleteGeneralEquipmentInspection = (id: string): Promise<void> => repo.remove(id);

export function newEquipmentRow(): GEEquipmentRow {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: '',
    model: '',
    serialNumber: '',
    condition: null,
    note: '',
    photo_paths: [],
  };
}
