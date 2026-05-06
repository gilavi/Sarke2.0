import { supabase } from '@/lib/supabase';

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
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, object_name, address, activity_type, inspection_date, act_number, inspection_type, department, inspector_name, equipment, conclusion, signer_name, signer_role, signer_role_custom, inspector_signature, completed_at, created_at, updated_at';

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
    inspectorSignature: r.inspector_signature,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listGeneralEquipmentInspections(
  projectId?: string,
): Promise<GeneralEquipmentInspection[]> {
  let q = supabase
    .from('general_equipment_inspections')
    .select(COLS)
    .order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(toModel);
}

export async function getGeneralEquipmentInspection(
  id: string,
): Promise<GeneralEquipmentInspection | null> {
  const { data, error } = await supabase
    .from('general_equipment_inspections')
    .select(COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toModel(data as DbRow) : null;
}

export async function createGeneralEquipmentInspection(args: {
  projectId: string;
  objectName?: string | null;
  activityType?: string | null;
  inspectionType?: GEInspectionType | null;
  department?: string | null;
  inspectorName?: string | null;
  actNumber?: string | null;
  inspectionDate?: string | null;
}): Promise<GeneralEquipmentInspection> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('არაავტორიზებული');
  const { data, error } = await supabase
    .from('general_equipment_inspections')
    .insert({
      project_id: args.projectId,
      template_id: GENERAL_EQUIPMENT_TEMPLATE_ID,
      user_id: userData.user.id,
      status: 'draft',
      object_name: args.objectName ?? null,
      activity_type: args.activityType ?? null,
      inspection_type: args.inspectionType ?? null,
      department: args.department ?? null,
      inspector_name: args.inspectorName ?? null,
      act_number: args.actNumber ?? null,
      ...(args.inspectionDate ? { inspection_date: args.inspectionDate } : {}),
      equipment: [],
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return toModel(data as DbRow);
}

export async function updateGeneralEquipmentInspection(
  id: string,
  patch: Partial<{
    objectName: string | null;
    address: string | null;
    activityType: string | null;
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
    status: 'draft' | 'completed';
  }>,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.objectName !== undefined) updates.object_name = patch.objectName;
  if (patch.address !== undefined) updates.address = patch.address;
  if (patch.activityType !== undefined) updates.activity_type = patch.activityType;
  if (patch.actNumber !== undefined) updates.act_number = patch.actNumber;
  if (patch.inspectionType !== undefined) updates.inspection_type = patch.inspectionType;
  if (patch.department !== undefined) updates.department = patch.department;
  if (patch.inspectorName !== undefined) updates.inspector_name = patch.inspectorName;
  if (patch.equipment !== undefined) updates.equipment = patch.equipment;
  if (patch.conclusion !== undefined) updates.conclusion = patch.conclusion;
  if (patch.signerName !== undefined) updates.signer_name = patch.signerName;
  if (patch.signerRole !== undefined) updates.signer_role = patch.signerRole;
  if (patch.signerRoleCustom !== undefined) updates.signer_role_custom = patch.signerRoleCustom;
  if (patch.inspectorSignature !== undefined) updates.inspector_signature = patch.inspectorSignature;
  if (patch.status !== undefined) {
    updates.status = patch.status;
    if (patch.status === 'completed') updates.completed_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from('general_equipment_inspections')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteGeneralEquipmentInspection(id: string): Promise<void> {
  const { error } = await supabase
    .from('general_equipment_inspections')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

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
