import { makeInspectionService } from './inspection/service';
import type { ForkliftInspection, ForkliftItemState } from '../types/forklift';
import { buildDefaultForkliftItems } from '../types/forklift';

// ── DB ↔ model mapping ────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: string;
  company: string | null;
  address: string | null;
  inventory_number: string | null;
  brand_model: string | null;
  engine_type: string | null;
  inspection_date: string;
  inspector_name: string | null;
  items: ForkliftItemState[];
  verdict: string | null;
  notes: string | null;
  summary_photos: string[];
  qual_doc_path: string | null;
  signer_name: string | null;
  signer_position: string | null;
  signer_phone: string | null;
  signer_signature: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): ForkliftInspection {
  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    userId: row.user_id,
    status: row.status as ForkliftInspection['status'],
    company: row.company,
    address: row.address,
    inventoryNumber: row.inventory_number,
    brandModel: row.brand_model,
    engineType: (row.engine_type ?? null) as ForkliftInspection['engineType'],
    inspectionDate: row.inspection_date,
    inspectorName: row.inspector_name,
    items: Array.isArray(row.items) && row.items.length === 39
      ? row.items
      : buildDefaultForkliftItems(),
    verdict: (row.verdict ?? null) as ForkliftInspection['verdict'],
    notes: row.notes,
    summaryPhotos: Array.isArray(row.summary_photos) ? row.summary_photos : [],
    qualDocPath: row.qual_doc_path,
    signerName: row.signer_name,
    signerPosition: row.signer_position,
    signerPhone: row.signer_phone,
    signerSignature: row.signer_signature,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Signatures are ephemeral (memory-only) — signer* fields are intentionally NOT
// persisted via patch, matching prior behavior.
type ForkliftPatch = Partial<{
  company: string | null;
  address: string | null;
  inventoryNumber: string | null;
  brandModel: string | null;
  engineType: ForkliftInspection['engineType'];
  inspectionDate: string;
  inspectorName: string | null;
  items: ForkliftItemState[];
  verdict: ForkliftInspection['verdict'];
  notes: string | null;
  summaryPhotos: string[];
  qualDocPath: string | null;
  signerName: string | null;
  signerPosition: string | null;
  signerPhone: string | null;
  signerSignature: string | null;
}>;

function toDb(patch: ForkliftPatch): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if ('company'         in patch) db.company          = patch.company;
  if ('address'         in patch) db.address          = patch.address;
  if ('inventoryNumber' in patch) db.inventory_number = patch.inventoryNumber;
  if ('brandModel'      in patch) db.brand_model      = patch.brandModel;
  if ('engineType'      in patch) db.engine_type      = patch.engineType;
  if ('inspectionDate'  in patch) db.inspection_date  = patch.inspectionDate;
  if ('inspectorName'   in patch) db.inspector_name   = patch.inspectorName;
  if ('items'           in patch) db.items            = patch.items;
  if ('verdict'         in patch) db.verdict          = patch.verdict;
  if ('notes'           in patch) db.notes            = patch.notes;
  if ('summaryPhotos'   in patch) db.summary_photos   = patch.summaryPhotos;
  if ('qualDocPath'     in patch) db.qual_doc_path    = patch.qualDocPath;
  return db;
}

// ── API ───────────────────────────────────────────────────────────────────────

const base = makeInspectionService<ForkliftInspection, ForkliftPatch>({
  table: 'forklift_inspections',
  pathPrefix: 'forklift',
  toModel,
  toDb,
  createColumns: (args) => ({
    inspector_name: args.inspectorName ?? null,
    items: buildDefaultForkliftItems(),
    summary_photos: [],
  }),
});

export const forkliftApi = {
  create: base.create,
  getById: base.getById,
  listByProject: base.listByProject,
  patch: base.patch,
  complete: base.complete,
  deletePhoto: base.deletePhoto,
  uploadPhoto: (inspectionId: string, itemId: number, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/${itemId}`, photoUri),
  uploadSummaryPhoto: (inspectionId: string, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/summary`, photoUri),
  uploadQualDoc: (inspectionId: string, photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/qual-doc`, photoUri),
};
