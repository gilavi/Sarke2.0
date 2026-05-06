import { supabase } from '@/lib/supabase';

export {
  EXCAVATOR_TEMPLATE_ID,
  EXCAVATOR_MACHINE_SPECS,
  EXCAVATOR_VERDICT_LABEL,
  ENGINE_ITEMS,
  UNDERCARRIAGE_ITEMS,
  CABIN_ITEMS,
  SAFETY_ITEMS,
  MAINTENANCE_ITEMS,
  type ExcavatorChecklistEntry,
  type ExcavatorChecklistItemState,
  type ExcavatorChecklistResult,
  type ExcavatorMachineSpecs,
  type ExcavatorMaintenanceEntry,
  type ExcavatorMaintenanceItemState,
  type ExcavatorVerdict,
  type ExcavatorInspection,
  type Section as ExcavatorSection,
} from '@/lib/types/excavator';

import type {
  ExcavatorChecklistItemState,
  ExcavatorInspection,
  ExcavatorMachineSpecs,
  ExcavatorMaintenanceItemState,
  ExcavatorVerdict,
} from '@/lib/types/excavator';
import {
  CABIN_ITEMS,
  ENGINE_ITEMS,
  EXCAVATOR_MACHINE_SPECS,
  EXCAVATOR_TEMPLATE_ID,
  MAINTENANCE_ITEMS,
  SAFETY_ITEMS,
  UNDERCARRIAGE_ITEMS,
} from '@/lib/types/excavator';

interface DbRow {
  id: string;
  project_id: string;
  template_id: string;
  user_id: string;
  status: 'draft' | 'completed';
  machine_specs: ExcavatorMachineSpecs;
  serial_number: string | null;
  inventory_number: string | null;
  project_name: string | null;
  department: string | null;
  inspection_date: string;
  moto_hours: number | null;
  inspector_name: string | null;
  last_inspection_date: string | null;
  engine_items: ExcavatorChecklistItemState[];
  undercarriage_items: ExcavatorChecklistItemState[];
  cabin_items: ExcavatorChecklistItemState[];
  safety_items: ExcavatorChecklistItemState[];
  maintenance_items: ExcavatorMaintenanceItemState[];
  verdict: ExcavatorVerdict | null;
  notes: string | null;
  inspector_position: string | null;
  inspector_signature: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, machine_specs, serial_number, inventory_number, project_name, department, inspection_date, moto_hours, inspector_name, last_inspection_date, engine_items, undercarriage_items, cabin_items, safety_items, maintenance_items, verdict, notes, inspector_position, inspector_signature, completed_at, created_at, updated_at';

function emptyChecklist(catalog: { id: number }[]): ExcavatorChecklistItemState[] {
  return catalog.map((c) => ({ id: c.id, result: null, comment: null, photo_paths: [] }));
}

function emptyMaintenance(): ExcavatorMaintenanceItemState[] {
  return MAINTENANCE_ITEMS.map((m) => ({ id: m.id, answer: null, date: null }));
}

function toModel(r: DbRow): ExcavatorInspection {
  return {
    id: r.id,
    projectId: r.project_id,
    templateId: r.template_id,
    userId: r.user_id,
    status: r.status,
    machineSpecs: r.machine_specs,
    serialNumber: r.serial_number,
    registrationNumber: null,
    inventoryNumber: r.inventory_number,
    projectName: r.project_name,
    department: r.department,
    inspectionDate: r.inspection_date,
    motoHours: r.moto_hours,
    inspectorName: r.inspector_name,
    lastInspectionDate: r.last_inspection_date,
    engineItems: r.engine_items ?? [],
    undercarriageItems: r.undercarriage_items ?? [],
    cabinItems: r.cabin_items ?? [],
    safetyItems: r.safety_items ?? [],
    maintenanceItems: r.maintenance_items ?? [],
    verdict: r.verdict,
    notes: r.notes,
    inspectorPosition: r.inspector_position,
    inspectorSignature: r.inspector_signature,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listExcavatorInspections(
  projectId?: string,
): Promise<ExcavatorInspection[]> {
  let q = supabase
    .from('excavator_inspections')
    .select(COLS)
    .order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(toModel);
}

export async function getExcavatorInspection(
  id: string,
): Promise<ExcavatorInspection | null> {
  const { data, error } = await supabase
    .from('excavator_inspections')
    .select(COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toModel(data as DbRow) : null;
}

export async function createExcavatorInspection(args: {
  projectId: string;
  serialNumber?: string | null;
  inventoryNumber?: string | null;
  projectName?: string | null;
  department?: string | null;
  inspectorName?: string | null;
}): Promise<ExcavatorInspection> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('არაავტორიზებული');
  const { data, error } = await supabase
    .from('excavator_inspections')
    .insert({
      project_id: args.projectId,
      template_id: EXCAVATOR_TEMPLATE_ID,
      user_id: userData.user.id,
      status: 'draft',
      machine_specs: EXCAVATOR_MACHINE_SPECS,
      serial_number: args.serialNumber ?? null,
      inventory_number: args.inventoryNumber ?? null,
      project_name: args.projectName ?? null,
      department: args.department ?? null,
      inspector_name: args.inspectorName ?? null,
      engine_items: emptyChecklist(ENGINE_ITEMS),
      undercarriage_items: emptyChecklist(UNDERCARRIAGE_ITEMS),
      cabin_items: emptyChecklist(CABIN_ITEMS),
      safety_items: emptyChecklist(SAFETY_ITEMS),
      maintenance_items: emptyMaintenance(),
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return toModel(data as DbRow);
}

export async function updateExcavatorInspection(
  id: string,
  patch: Partial<{
    serialNumber: string | null;
    inventoryNumber: string | null;
    projectName: string | null;
    department: string | null;
    motoHours: number | null;
    inspectorName: string | null;
    lastInspectionDate: string | null;
    engineItems: ExcavatorChecklistItemState[];
    undercarriageItems: ExcavatorChecklistItemState[];
    cabinItems: ExcavatorChecklistItemState[];
    safetyItems: ExcavatorChecklistItemState[];
    maintenanceItems: ExcavatorMaintenanceItemState[];
    verdict: ExcavatorVerdict | null;
    notes: string | null;
    inspectorPosition: string | null;
    inspectorSignature: string | null;
    status: 'draft' | 'completed';
  }>,
): Promise<void> {
  const u: Record<string, unknown> = {};
  if (patch.serialNumber !== undefined) u.serial_number = patch.serialNumber;
  if (patch.inventoryNumber !== undefined) u.inventory_number = patch.inventoryNumber;
  if (patch.projectName !== undefined) u.project_name = patch.projectName;
  if (patch.department !== undefined) u.department = patch.department;
  if (patch.motoHours !== undefined) u.moto_hours = patch.motoHours;
  if (patch.inspectorName !== undefined) u.inspector_name = patch.inspectorName;
  if (patch.lastInspectionDate !== undefined) u.last_inspection_date = patch.lastInspectionDate;
  if (patch.engineItems !== undefined) u.engine_items = patch.engineItems;
  if (patch.undercarriageItems !== undefined) u.undercarriage_items = patch.undercarriageItems;
  if (patch.cabinItems !== undefined) u.cabin_items = patch.cabinItems;
  if (patch.safetyItems !== undefined) u.safety_items = patch.safetyItems;
  if (patch.maintenanceItems !== undefined) u.maintenance_items = patch.maintenanceItems;
  if (patch.verdict !== undefined) u.verdict = patch.verdict;
  if (patch.notes !== undefined) u.notes = patch.notes;
  if (patch.inspectorPosition !== undefined) u.inspector_position = patch.inspectorPosition;
  if (patch.inspectorSignature !== undefined) u.inspector_signature = patch.inspectorSignature;
  if (patch.status !== undefined) {
    u.status = patch.status;
    if (patch.status === 'completed') u.completed_at = new Date().toISOString();
  }
  const { error } = await supabase.from('excavator_inspections').update(u).eq('id', id);
  if (error) throw error;
}

export async function deleteExcavatorInspection(id: string): Promise<void> {
  const { error } = await supabase.from('excavator_inspections').delete().eq('id', id);
  if (error) throw error;
}
