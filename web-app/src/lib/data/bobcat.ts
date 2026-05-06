import { supabase } from '@/lib/supabase';

// Re-export the canonical mobile checklist so web stays in sync.
export {
  BOBCAT_ITEMS,
  LARGE_LOADER_ITEMS,
  BOBCAT_TEMPLATE_ID,
  LARGE_LOADER_TEMPLATE_ID,
  type BobcatChecklistEntry,
  type BobcatItemResult,
  type BobcatInspectionType,
  type BobcatVerdict,
  type BobcatItemState,
  type BobcatInspection,
} from '@/lib/types/bobcat';

import type {
  BobcatInspection,
  BobcatInspectionType,
  BobcatItemState,
  BobcatVerdict,
} from '@/lib/types/bobcat';
import { BOBCAT_ITEMS } from '@/lib/types/bobcat';

interface DbRow {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: 'draft' | 'completed';
  company: string | null;
  address: string | null;
  equipment_model: string | null;
  registration_number: string | null;
  inspection_date: string;
  inspection_type: BobcatInspectionType | null;
  department: string | null;
  inspector_name: string | null;
  items: BobcatItemState[] | null;
  verdict: BobcatVerdict | null;
  notes: string | null;
  inspector_signature: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, company, address, equipment_model, registration_number, inspection_date, inspection_type, department, inspector_name, items, verdict, notes, inspector_signature, completed_at, created_at, updated_at';

function toModel(r: DbRow): BobcatInspection {
  return {
    id: r.id,
    projectId: r.project_id,
    templateId: r.template_id,
    userId: r.user_id,
    status: r.status,
    company: r.company,
    address: r.address,
    equipmentModel: r.equipment_model,
    registrationNumber: r.registration_number,
    inspectionDate: r.inspection_date,
    inspectionType: r.inspection_type,
    department: r.department,
    inspectorName: r.inspector_name,
    items: r.items ?? [],
    verdict: r.verdict,
    notes: r.notes,
    inspectorSignature: r.inspector_signature,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listBobcatInspections(projectId?: string): Promise<BobcatInspection[]> {
  let q = supabase
    .from('bobcat_inspections')
    .select(COLS)
    .order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(toModel);
}

export async function getBobcatInspection(id: string): Promise<BobcatInspection | null> {
  const { data, error } = await supabase
    .from('bobcat_inspections')
    .select(COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toModel(data as DbRow) : null;
}

function emptyItems(): BobcatItemState[] {
  return BOBCAT_ITEMS.map((it) => ({
    id: it.id,
    result: null,
    comment: null,
    photo_paths: [],
  }));
}

export async function createBobcatInspection(args: {
  projectId: string;
  templateId: string;
  company?: string | null;
  equipmentModel?: string | null;
  registrationNumber?: string | null;
  inspectionType?: BobcatInspectionType | null;
  department?: string | null;
  inspectorName?: string | null;
}): Promise<BobcatInspection> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('არაავტორიზებული');

  const { data, error } = await supabase
    .from('bobcat_inspections')
    .insert({
      project_id: args.projectId,
      template_id: args.templateId,
      user_id: userData.user.id,
      status: 'draft',
      company: args.company ?? null,
      equipment_model: args.equipmentModel ?? null,
      registration_number: args.registrationNumber ?? null,
      inspection_type: args.inspectionType ?? null,
      department: args.department ?? null,
      inspector_name: args.inspectorName ?? null,
      items: emptyItems(),
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return toModel(data as DbRow);
}

export async function updateBobcatInspection(
  id: string,
  patch: Partial<{
    company: string | null;
    address: string | null;
    equipmentModel: string | null;
    registrationNumber: string | null;
    inspectionType: BobcatInspectionType | null;
    department: string | null;
    inspectorName: string | null;
    items: BobcatItemState[];
    verdict: BobcatVerdict | null;
    notes: string | null;
    inspectorSignature: string | null;
    status: 'draft' | 'completed';
  }>,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.company !== undefined) updates.company = patch.company;
  if (patch.address !== undefined) updates.address = patch.address;
  if (patch.equipmentModel !== undefined) updates.equipment_model = patch.equipmentModel;
  if (patch.registrationNumber !== undefined)
    updates.registration_number = patch.registrationNumber;
  if (patch.inspectionType !== undefined) updates.inspection_type = patch.inspectionType;
  if (patch.department !== undefined) updates.department = patch.department;
  if (patch.inspectorName !== undefined) updates.inspector_name = patch.inspectorName;
  if (patch.items !== undefined) updates.items = patch.items;
  if (patch.verdict !== undefined) updates.verdict = patch.verdict;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.inspectorSignature !== undefined) updates.inspector_signature = patch.inspectorSignature;
  if (patch.status !== undefined) {
    updates.status = patch.status;
    if (patch.status === 'completed') updates.completed_at = new Date().toISOString();
  }
  const { error } = await supabase.from('bobcat_inspections').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteBobcatInspection(id: string): Promise<void> {
  const { error } = await supabase.from('bobcat_inspections').delete().eq('id', id);
  if (error) throw error;
}
