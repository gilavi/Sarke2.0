import { makeRepository, mapDefined } from '@/lib/db/repository';

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
import type { SignatoryEntry } from '@/lib/data/inspections';
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
  signatories: SignatoryEntry[] | null;
  summary_photos: string[] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, machine_specs, serial_number, inventory_number, project_name, department, inspection_date, moto_hours, inspector_name, last_inspection_date, engine_items, undercarriage_items, cabin_items, safety_items, maintenance_items, verdict, notes, inspector_position, summary_photos, completed_at, created_at, updated_at';

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
    inspectorSignature: null,
    signatories: [],
    summaryPhotos: r.summary_photos ?? [],
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface CreateExcavatorArgs {
  projectId: string;
  serialNumber?: string | null;
  inventoryNumber?: string | null;
  projectName?: string | null;
  department?: string | null;
  inspectorName?: string | null;
  inspectionDate?: string | null;
}

export type ExcavatorPatch = Partial<{
  serialNumber: string | null;
  inventoryNumber: string | null;
  projectName: string | null;
  department: string | null;
  motoHours: number | null;
  inspectionDate: string | null;
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
  signatories: SignatoryEntry[];
  summaryPhotos: string[];
  status: 'draft' | 'completed';
}>;

const repo = makeRepository<ExcavatorInspection, DbRow, CreateExcavatorArgs, ExcavatorPatch>({
  table: 'excavator_inspections',
  columns: COLS,
  parentInspection: { type: 'excavator' },
  toModel,
  toInsert: (args, userId) => ({
    project_id: args.projectId,
    template_id: EXCAVATOR_TEMPLATE_ID,
    user_id: userId,
    status: 'draft',
    machine_specs: EXCAVATOR_MACHINE_SPECS,
    serial_number: args.serialNumber ?? null,
    inventory_number: args.inventoryNumber ?? null,
    project_name: args.projectName ?? null,
    department: args.department ?? null,
    inspector_name: args.inspectorName ?? null,
    ...(args.inspectionDate ? { inspection_date: args.inspectionDate } : {}),
    engine_items: emptyChecklist(ENGINE_ITEMS),
    undercarriage_items: emptyChecklist(UNDERCARRIAGE_ITEMS),
    cabin_items: emptyChecklist(CABIN_ITEMS),
    safety_items: emptyChecklist(SAFETY_ITEMS),
    maintenance_items: emptyMaintenance(),
  }),
  toUpdate: (patch) => {
    const row = mapDefined(patch, {
      serialNumber: 'serial_number',
      inventoryNumber: 'inventory_number',
      projectName: 'project_name',
      department: 'department',
      motoHours: 'moto_hours',
      inspectionDate: 'inspection_date',
      inspectorName: 'inspector_name',
      lastInspectionDate: 'last_inspection_date',
      engineItems: 'engine_items',
      undercarriageItems: 'undercarriage_items',
      cabinItems: 'cabin_items',
      safetyItems: 'safety_items',
      maintenanceItems: 'maintenance_items',
      verdict: 'verdict',
      notes: 'notes',
      inspectorPosition: 'inspector_position',
      summaryPhotos: 'summary_photos',
    });
    if (patch.status !== undefined) {
      row.status = patch.status;
      if (patch.status === 'completed') row.completed_at = new Date().toISOString();
    }
    return row;
  },
});

export const listExcavatorInspections = (projectId?: string): Promise<ExcavatorInspection[]> =>
  repo.list(projectId);
export const getExcavatorInspection = (id: string): Promise<ExcavatorInspection | null> =>
  repo.get(id);
export const createExcavatorInspection = (
  args: CreateExcavatorArgs,
): Promise<ExcavatorInspection> => repo.create(args);
export const updateExcavatorInspection = (id: string, patch: ExcavatorPatch): Promise<void> =>
  repo.update(id, patch);
export const deleteExcavatorInspection = (id: string): Promise<void> => repo.remove(id);
