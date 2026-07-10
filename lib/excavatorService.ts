import { makeInspectionService } from './inspection/service';
import { makeToDb } from './inspection/rowMapper';
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
  summary_photos: string[];
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
    summaryPhotos: Array.isArray(row.summary_photos) ? row.summary_photos : [],
    inspectorPosition: row.inspector_position,
    inspectorSignature: row.inspector_signature,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Signatures are ephemeral (memory-only) - inspectorPosition/inspectorSignature
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
  summaryPhotos: string[];
  inspectorPosition: string | null;
  inspectorSignature: string | null;
}>;

// Mechanical camel→snake writes; `inspectorPosition`/`inspectorSignature` are
// intentionally absent (ephemeral, memory-only). `summaryPhotos` persists to
// the DB (origin/main moved bobcat/excavator summary photos off AsyncStorage).
// See lib/inspection/rowMapper.ts.
const toDb = makeToDb<ExcavatorPatch>({
  serialNumber: 'serial_number',
  registrationNumber: 'registration_number',
  inventoryNumber: 'inventory_number',
  projectName: 'project_name',
  department: 'department',
  inspectionDate: 'inspection_date',
  motoHours: 'moto_hours',
  inspectorName: 'inspector_name',
  lastInspectionDate: 'last_inspection_date',
  engineItems: 'engine_items',
  undercarriageItems: 'undercarriage_items',
  cabinItems: 'cabin_items',
  safetyItems: 'safety_items',
  maintenanceItems: 'maintenance_items',
  verdict: 'verdict',
  notes: 'notes',
  summaryPhotos: 'summary_photos',
});

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
      summary_photos: [],
    };
  },
});

export const excavatorApi = {
  create: base.create,
  getById: base.getById,
  listByProject: base.listByProject,
  patch: base.patch,
  complete: base.complete,
  reopen: base.reopen,
  deletePhoto: base.deletePhoto,
  uploadPhotoAt: base.uploadPhotoAt,
  uploadSummaryPhoto: (inspectionId: string, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/summary`, photoUri),
};
