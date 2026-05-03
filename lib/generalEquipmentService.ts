import { supabase, STORAGE_BUCKETS } from './supabase';
import { storageApi } from './services';
import { logError } from './logError';
import * as Crypto from 'expo-crypto';
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

// ── API ───────────────────────────────────────────────────────────────────────

export const generalEquipmentApi = {
  create: async (args: {
    projectId: string;
    templateId: string;
    inspectorName?: string;
  }): Promise<GeneralEquipmentInspection> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const ts  = Date.now().toString(36).slice(-4).toUpperCase();
    const actNumber = `GEI-${new Date().getFullYear()}-${ts}`;

    const { data, error } = await supabase
      .from('general_equipment_inspections')
      .insert({
        project_id:     args.projectId,
        template_id:    args.templateId,
        user_id:        user.id,
        inspection_date: new Date().toISOString().slice(0, 10),
        act_number:     actNumber,
        inspector_name: args.inspectorName ?? null,
        equipment:      buildDefaultEquipment(),
        summary_photos: [],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  getById: async (id: string): Promise<GeneralEquipmentInspection | null> => {
    const { data, error } = await supabase
      .from('general_equipment_inspections')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toModel(data as DbRow);
  },

  patch: async (
    id: string,
    patch: Partial<{
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
    }>,
  ): Promise<void> => {
    const db: Record<string, unknown> = {};
    if ('objectName'         in patch) db.object_name          = patch.objectName;
    if ('address'            in patch) db.address               = patch.address;
    if ('activityType'       in patch) db.activity_type         = patch.activityType;
    if ('inspectionDate'     in patch) db.inspection_date       = patch.inspectionDate;
    if ('actNumber'          in patch) db.act_number            = patch.actNumber;
    if ('inspectionType'     in patch) db.inspection_type       = patch.inspectionType;
    if ('inspectorName'      in patch) db.inspector_name        = patch.inspectorName;
    if ('equipment'          in patch) db.equipment             = patch.equipment;
    if ('conclusion'         in patch) db.conclusion            = patch.conclusion;
    if ('summaryPhotos'      in patch) db.summary_photos        = patch.summaryPhotos;
    if ('signerName'         in patch) db.signer_name           = patch.signerName;
    if ('signerRole'         in patch) db.signer_role           = patch.signerRole;
    if ('signerRoleCustom'   in patch) db.signer_role_custom    = patch.signerRoleCustom;
    if ('inspectorSignature' in patch) db.inspector_signature   = patch.inspectorSignature;

    if (Object.keys(db).length === 0) return;
    const { error } = await supabase
      .from('general_equipment_inspections')
      .update(db)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  complete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('general_equipment_inspections')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  /**
   * Upload a photo for an equipment row or the summary section.
   *
   * @param context  'equipment' for row photos, 'summary' for conclusion photos
   * @param itemId   equipment row ID (string uuid) or 'summary' for summary context
   *
   * Storage path: general_equipment/{inspectionId}/{context}/{itemId}/{uuid}.jpg
   */
  uploadPhoto: async (
    inspectionId: string,
    context: 'equipment' | 'summary',
    itemId: string,
    photoUri: string,
  ): Promise<string> => {
    const uuid = Crypto.randomUUID();
    const path = `general_equipment/${inspectionId}/${context}/${itemId}/${uuid}.jpg`;
    await storageApi.uploadFromUri(
      STORAGE_BUCKETS.answerPhotos,
      path,
      photoUri,
      'image/jpeg',
      'inspection',
    );
    return path;
  },

  deletePhoto: async (path: string): Promise<void> => {
    await storageApi.remove(STORAGE_BUCKETS.answerPhotos, path)
      .catch((e) => logError(e, 'generalEquipment.deletePhoto'));
  },
};
