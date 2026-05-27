import { makeInspectionService } from './inspection/service';
import type {
  ExcavatorInspection,
  ExcavatorChecklistItemState,
  ExcavatorMaintenanceItemState,
  ExcavatorMachineSpecs,
  ExcavatorVerdict,
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
  registration_number: string | null;
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
    registrationNumber: row.registration_number,
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

// Signatures are ephemeral (memory-only) — inspectorPosition/inspectorSignature
// are intentionally NOT persisted, matching prior behavior.
type ExcavatorPatch = Partial<{
  serialNumber: string | null;
  registrationNumber: string | null;
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
  verdict: ExcavatorVerdict | null;
  notes: string | null;
  inspectorPosition: string | null;
  inspectorSignature: string | null;
}>;

function toDb(patch: ExcavatorPatch): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if ('serialNumber'       in patch) db.serial_number        = patch.serialNumber;
  if ('registrationNumber' in patch) db.registration_number  = patch.registrationNumber;
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
  return db;
}

// ── API ───────────────────────────────────────────────────────────────────────

const base = makeInspectionService<ExcavatorInspection, ExcavatorPatch>({
  table: 'excavator_inspections',
  pathPrefix: 'excavator',
  inspectionType: 'excavator',
  toModel,
  toDb,
  createColumns: (args) => {
    const d = buildDefaultExcavatorItems();
    return {
      inspector_name: args.inspectorName ?? null,
      machine_specs: EXCAVATOR_MACHINE_SPECS,
      engine_items: d.engineItems,
      undercarriage_items: d.undercarriageItems,
      cabin_items: d.cabinItems,
      safety_items: d.safetyItems,
      maintenance_items: d.maintenanceItems,
    };
  },
});

export const excavatorApi = {
  create: base.create,
  getById: base.getById,
  listByProject: base.listByProject,
  patch: base.patch,
  complete: base.complete,
  deletePhoto: base.deletePhoto,
  uploadPhoto: (inspectionId: string, section: string, itemId: number, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/${section}/${itemId}`, photoUri),
  uploadSummaryPhoto: (inspectionId: string, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/summary`, photoUri),
};
