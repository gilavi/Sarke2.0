import { supabase, STORAGE_BUCKETS } from './supabase';
import { storageApi } from './services';
import { logError } from './logError';
import * as Crypto from 'expo-crypto';
import type {
  ExcavatorInspection,
  ExcavatorChecklistItemState,
  ExcavatorMaintenanceItemState,
  ExcavatorMachineSpecs,
} from '../types/excavator';
import {
  EXCAVATOR_MACHINE_SPECS,
  buildDefaultExcavatorItems,
} from '../types/excavator';

// ── DB ↔ model mapping ────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: string;
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
  verdict: string | null;
  notes: string | null;
  inspector_position: string | null;
  inspector_signature: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): ExcavatorInspection {
  const defaults = buildDefaultExcavatorItems();
  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id ?? '',
    userId: row.user_id,
    status: row.status as ExcavatorInspection['status'],
    machineSpecs: row.machine_specs ?? EXCAVATOR_MACHINE_SPECS,
    serialNumber: row.serial_number,
    inventoryNumber: row.inventory_number,
    projectName: row.project_name,
    department: row.department,
    inspectionDate: row.inspection_date,
    motoHours: row.moto_hours,
    inspectorName: row.inspector_name,
    lastInspectionDate: row.last_inspection_date,
    engineItems:        Array.isArray(row.engine_items)        && row.engine_items.length        === 8  ? row.engine_items        : defaults.engineItems,
    undercarriageItems: Array.isArray(row.undercarriage_items) && row.undercarriage_items.length === 11 ? row.undercarriage_items : defaults.undercarriageItems,
    cabinItems:         Array.isArray(row.cabin_items)         && row.cabin_items.length         === 8  ? row.cabin_items         : defaults.cabinItems,
    safetyItems:        Array.isArray(row.safety_items)        && row.safety_items.length        === 7  ? row.safety_items        : defaults.safetyItems,
    maintenanceItems:   Array.isArray(row.maintenance_items)   && row.maintenance_items.length   === 3  ? row.maintenance_items   : defaults.maintenanceItems,
    verdict: (row.verdict ?? null) as ExcavatorInspection['verdict'],
    notes: row.notes,
    inspectorPosition: row.inspector_position,
    inspectorSignature: row.inspector_signature,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const excavatorApi = {
  create: async (args: {
    projectId: string;
    templateId: string;
    inspectorName?: string;
  }): Promise<ExcavatorInspection> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const defaults = buildDefaultExcavatorItems();
    const { data, error } = await supabase
      .from('excavator_inspections')
      .insert({
        project_id: args.projectId,
        template_id: args.templateId,
        user_id: user.id,
        machine_specs: EXCAVATOR_MACHINE_SPECS,
        inspection_date: new Date().toISOString().slice(0, 10),
        inspector_name: args.inspectorName ?? null,
        engine_items:        defaults.engineItems,
        undercarriage_items: defaults.undercarriageItems,
        cabin_items:         defaults.cabinItems,
        safety_items:        defaults.safetyItems,
        maintenance_items:   defaults.maintenanceItems,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  getById: async (id: string): Promise<ExcavatorInspection | null> => {
    const { data, error } = await supabase
      .from('excavator_inspections')
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
      serialNumber: string | null;
      inventoryNumber: string | null;
      projectName: string | null;
      department: string | null;
      inspectionDate: string;
      motoHours: number | null;
      inspectorName: string | null;
      lastInspectionDate: string | null;
      engineItems: ExcavatorChecklistItemState[];
      undercarriageItems: ExcavatorChecklistItemState[];
      cabinItems: ExcavatorChecklistItemState[];
      safetyItems: ExcavatorChecklistItemState[];
      maintenanceItems: ExcavatorMaintenanceItemState[];
      verdict: ExcavatorInspection['verdict'];
      notes: string | null;
      inspectorPosition: string | null;
      inspectorSignature: string | null;
    }>,
  ): Promise<void> => {
    const db: Record<string, unknown> = {};
    if ('serialNumber'       in patch) db.serial_number        = patch.serialNumber;
    if ('inventoryNumber'    in patch) db.inventory_number     = patch.inventoryNumber;
    if ('projectName'        in patch) db.project_name         = patch.projectName;
    if ('department'         in patch) db.department           = patch.department;
    if ('inspectionDate'     in patch) db.inspection_date      = patch.inspectionDate;
    if ('motoHours'          in patch) db.moto_hours           = patch.motoHours;
    if ('inspectorName'      in patch) db.inspector_name       = patch.inspectorName;
    if ('lastInspectionDate' in patch) db.last_inspection_date = patch.lastInspectionDate;
    if ('engineItems'        in patch) db.engine_items         = patch.engineItems;
    if ('undercarriageItems' in patch) db.undercarriage_items  = patch.undercarriageItems;
    if ('cabinItems'         in patch) db.cabin_items          = patch.cabinItems;
    if ('safetyItems'        in patch) db.safety_items         = patch.safetyItems;
    if ('maintenanceItems'   in patch) db.maintenance_items    = patch.maintenanceItems;
    if ('verdict'            in patch) db.verdict              = patch.verdict;
    if ('notes'              in patch) db.notes                = patch.notes;
    if ('inspectorPosition'  in patch) db.inspector_position   = patch.inspectorPosition;
    if ('inspectorSignature' in patch) db.inspector_signature  = patch.inspectorSignature;

    if (Object.keys(db).length === 0) return;
    const { error } = await supabase
      .from('excavator_inspections')
      .update(db)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  complete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('excavator_inspections')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  uploadPhoto: async (
    inspectionId: string,
    section: string,
    itemId: number,
    photoUri: string,
  ): Promise<string> => {
    const uuid = Crypto.randomUUID();
    const path = `excavator/${inspectionId}/${section}/${itemId}/${uuid}.jpg`;
    await storageApi.uploadFromUri(
      STORAGE_BUCKETS.answerPhotos,
      path,
      photoUri,
      'image/jpeg',
      'inspection',
    );
    return path;
  },

  listByProject: async (projectId: string): Promise<ExcavatorInspection[]> => {
    const { data, error } = await supabase
      .from('excavator_inspections')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
  },

  deletePhoto: async (path: string): Promise<void> => {
    await storageApi.remove(STORAGE_BUCKETS.answerPhotos, path)
      .catch((e) => logError(e, 'excavator.deletePhoto'));
  },
};
