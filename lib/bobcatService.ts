import { makeInspectionService } from './inspection/service';
import type { BobcatInspection, BobcatItemState } from '../types/bobcat';
import {
  buildDefaultItems,
  LARGE_LOADER_TEMPLATE_ID,
  LARGE_LOADER_ITEMS,
} from '../types/bobcat';

// ── DB ↔ model mapping ────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: string;
  company: string | null;
  address: string | null;
  equipment_model: string | null;
  registration_number: string | null;
  inspection_date: string;
  inspection_type: string | null;
  inspector_name: string | null;
  items: BobcatItemState[];
  verdict: string | null;
  notes: string | null;
  inspector_signature: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function catalogFor(templateId: string | null) {
  return templateId === LARGE_LOADER_TEMPLATE_ID ? LARGE_LOADER_ITEMS : undefined;
}

function toModel(row: DbRow): BobcatInspection {
  const catalog = catalogFor(row.template_id);
  const expectedLength = (catalog ?? []).length || 30;
  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    userId: row.user_id,
    status: row.status as BobcatInspection['status'],
    company: row.company,
    address: row.address,
    equipmentModel: row.equipment_model,
    registrationNumber: row.registration_number,
    inspectionDate: row.inspection_date,
    inspectionType: (row.inspection_type ?? null) as BobcatInspection['inspectionType'],
    inspectorName: row.inspector_name,
    items: Array.isArray(row.items) && row.items.length === expectedLength
      ? row.items
      : buildDefaultItems(catalog),
    verdict: (row.verdict ?? null) as BobcatInspection['verdict'],
    notes: row.notes,
    inspectorSignature: row.inspector_signature,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// inspectorSignature is ephemeral (memory-only) - never persisted via patch.
type BobcatPatch = Partial<{
  company: string | null;
  address: string | null;
  equipmentModel: string | null;
  registrationNumber: string | null;
  inspectionDate: string;
  inspectionType: BobcatInspection['inspectionType'];
  inspectorName: string | null;
  items: BobcatItemState[];
  verdict: BobcatInspection['verdict'];
  notes: string | null;
  inspectorSignature: string | null;
}>;

function toDb(patch: BobcatPatch): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if ('company'            in patch) db.company             = patch.company;
  if ('address'            in patch) db.address             = patch.address;
  if ('equipmentModel'     in patch) db.equipment_model     = patch.equipmentModel;
  if ('registrationNumber' in patch) db.registration_number = patch.registrationNumber;
  if ('inspectionDate'     in patch) db.inspection_date     = patch.inspectionDate;
  if ('inspectionType'     in patch) db.inspection_type     = patch.inspectionType;
  if ('inspectorName'      in patch) db.inspector_name      = patch.inspectorName;
  if ('items'              in patch) db.items               = patch.items;
  if ('verdict'            in patch) db.verdict             = patch.verdict;
  if ('notes'              in patch) db.notes               = patch.notes;
  return db;
}

// ── API ───────────────────────────────────────────────────────────────────────

const base = makeInspectionService<BobcatInspection, BobcatPatch>({
  table: 'bobcat_inspections',
  pathPrefix: 'bobcat',
  inspectionType: 'bobcat',
  toModel,
  toDb,
  createColumns: (args) => ({
    inspector_name: args.inspectorName ?? null,
    items: buildDefaultItems(catalogFor(args.templateId)),
  }),
});

export const bobcatApi = {
  create: base.create,
  getById: base.getById,
  listByProject: base.listByProject,
  patch: base.patch,
  complete: base.complete,
  reopen: base.reopen,
  deletePhoto: base.deletePhoto,
  uploadPhoto: (inspectionId: string, itemId: number, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/${itemId}`, photoUri),
  uploadSummaryPhoto: (inspectionId: string, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/summary`, photoUri),
};
