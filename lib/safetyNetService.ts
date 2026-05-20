import { makeInspectionService } from './inspection/service';
import type { SafetyNetInspection, SNItemState, SNPostTestState, SNLoadTestRow, SNSignatory } from '../types/safetyNet';
import {
  buildDefaultSNItems,
  buildDefaultSNPostTestItems,
  buildDefaultSNLoadTestRow,
} from '../types/safetyNet';

// ── DB ↔ model mapping ────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: string;
  company: string | null;
  address: string | null;
  inspector_name: string | null;
  inspection_date: string;
  manufacturer: string | null;
  net_size: string | null;
  post_size: string | null;
  post_count: number | null;
  post_anchor_count: number | null;
  anchor_point_count: number | null;
  edge_rope_count: number | null;
  cell_side: string | null;
  working_distance: string | null;
  certificate: string | null;
  items: SNItemState[];
  load_test_rows: SNLoadTestRow[];
  post_test_items: SNPostTestState[];
  verdict: string | null;
  verdict_comment: string | null;
  signatures: [SNSignatory, SNSignatory];
  qual_doc_path: string | null;
  summary_photos: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): SafetyNetInspection {
  const items: SNItemState[] = Array.isArray(row.items) && row.items.length === 10
    ? row.items
    : buildDefaultSNItems();

  const postTestItems: SNPostTestState[] = Array.isArray(row.post_test_items) && row.post_test_items.length === 5
    ? row.post_test_items
    : buildDefaultSNPostTestItems();

  const loadTestRows: SNLoadTestRow[] = Array.isArray(row.load_test_rows) && row.load_test_rows.length > 0
    ? row.load_test_rows
    : [buildDefaultSNLoadTestRow(), buildDefaultSNLoadTestRow(), buildDefaultSNLoadTestRow()];

  const emptySignatory = (): SNSignatory => ({ name: '', position: '', organization: '', signature: null, date: null });
  const rawSigs = row.signatures;
  const signatures: [SNSignatory, SNSignatory] = [
    rawSigs?.[0] ?? emptySignatory(),
    rawSigs?.[1] ?? emptySignatory(),
  ];

  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    userId: row.user_id,
    status: row.status as SafetyNetInspection['status'],
    company: row.company ?? '',
    address: row.address ?? '',
    inspectorName: row.inspector_name ?? '',
    inspectionDate: row.inspection_date,
    manufacturer: row.manufacturer ?? '',
    netSize: row.net_size ?? '',
    postSize: row.post_size ?? '',
    postCount: row.post_count,
    postAnchorCount: row.post_anchor_count,
    anchorPointCount: row.anchor_point_count,
    edgeRopeCount: row.edge_rope_count,
    cellSide: row.cell_side ?? '',
    workingDistance: row.working_distance ?? '',
    certificate: (row.certificate as SafetyNetInspection['certificate']) ?? null,
    items,
    loadTestRows,
    postTestItems,
    verdict: (row.verdict as SafetyNetInspection['verdict']) ?? null,
    verdictComment: row.verdict_comment ?? '',
    signatures,
    qualDocPath: row.qual_doc_path,
    summaryPhotos: Array.isArray(row.summary_photos) ? row.summary_photos : [],
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// signatures are ephemeral (memory-only) — never persisted via patch.
type SafetyNetPatch = Partial<{
  company: string;
  address: string;
  inspectorName: string;
  inspectionDate: string;
  manufacturer: string;
  netSize: string;
  postSize: string;
  postCount: number | null;
  postAnchorCount: number | null;
  anchorPointCount: number | null;
  edgeRopeCount: number | null;
  cellSide: string;
  workingDistance: string;
  certificate: SafetyNetInspection['certificate'];
  items: SNItemState[];
  loadTestRows: SNLoadTestRow[];
  postTestItems: SNPostTestState[];
  verdict: SafetyNetInspection['verdict'];
  verdictComment: string;
  signatures: [SNSignatory, SNSignatory];
  qualDocPath: string | null;
  summaryPhotos: string[];
}>;

function toDb(patch: SafetyNetPatch): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if ('company'          in patch) db.company           = patch.company;
  if ('address'          in patch) db.address           = patch.address;
  if ('inspectorName'    in patch) db.inspector_name    = patch.inspectorName;
  if ('inspectionDate'   in patch) db.inspection_date   = patch.inspectionDate;
  if ('manufacturer'     in patch) db.manufacturer      = patch.manufacturer;
  if ('netSize'          in patch) db.net_size          = patch.netSize;
  if ('postSize'         in patch) db.post_size         = patch.postSize;
  if ('postCount'        in patch) db.post_count        = patch.postCount;
  if ('postAnchorCount'  in patch) db.post_anchor_count = patch.postAnchorCount;
  if ('anchorPointCount' in patch) db.anchor_point_count = patch.anchorPointCount;
  if ('edgeRopeCount'    in patch) db.edge_rope_count   = patch.edgeRopeCount;
  if ('cellSide'         in patch) db.cell_side         = patch.cellSide;
  if ('workingDistance'  in patch) db.working_distance  = patch.workingDistance;
  if ('certificate'      in patch) db.certificate       = patch.certificate;
  if ('items'            in patch) db.items             = patch.items;
  if ('loadTestRows'     in patch) db.load_test_rows    = patch.loadTestRows;
  if ('postTestItems'    in patch) db.post_test_items   = patch.postTestItems;
  if ('verdict'          in patch) db.verdict           = patch.verdict;
  if ('verdictComment'   in patch) db.verdict_comment   = patch.verdictComment;
  if ('qualDocPath'      in patch) db.qual_doc_path     = patch.qualDocPath;
  if ('summaryPhotos'    in patch) db.summary_photos    = patch.summaryPhotos;
  return db;
}

// ── API ───────────────────────────────────────────────────────────────────────

const base = makeInspectionService<SafetyNetInspection, SafetyNetPatch>({
  table: 'safety_net_inspections',
  pathPrefix: 'safety-net',
  toModel,
  toDb,
  createColumns: (args) => {
    const firstSignatory: SNSignatory = {
      name: args.inspectorName ?? '', position: '', organization: '', signature: null, date: null,
    };
    return {
      inspector_name: args.inspectorName ?? null,
      items: buildDefaultSNItems(),
      load_test_rows: [buildDefaultSNLoadTestRow(), buildDefaultSNLoadTestRow(), buildDefaultSNLoadTestRow()],
      post_test_items: buildDefaultSNPostTestItems(),
      signatures: [firstSignatory, { name: '', position: '', organization: '', signature: null, date: null }],
    };
  },
});

export const safetyNetApi = {
  create: base.create,
  getById: base.getById,
  listByProject: base.listByProject,
  patch: base.patch,
  complete: base.complete,
  deletePhoto: base.deletePhoto,
  uploadPhoto: (inspectionId: string, itemId: number | 'qual-doc' | 'summary', photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/${itemId}`, photoUri),
};
