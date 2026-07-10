import { makeInspectionService } from './inspection/service';
import { makeToDb } from './inspection/rowMapper';
import type {
  MobileLadderInspection,
  MLItemState,
  MLSignatory,
} from '../types/mobileLadder';
import {
  buildDefaultMLItems,
  buildDefaultMLSignatory,
} from '../types/mobileLadder';

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
  ladder_type: string | null;
  ladder_type_unknown: boolean;
  model: string | null;
  model_unknown: boolean;
  height_m: number | null;
  height_unknown: boolean;
  max_load_kg: number | null;
  max_load_unknown: boolean;
  next_inspection_date: string | null;
  items: MLItemState[];
  verdict: string | null;
  verdict_comment: string | null;
  summary_photos: string[];
  signature: MLSignatory;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): MobileLadderInspection {
  const items: MLItemState[] =
    Array.isArray(row.items) && row.items.length === 8
      ? row.items
      : buildDefaultMLItems();

  const sig = row.signature && typeof row.signature === 'object'
    ? (row.signature as MLSignatory)
    : buildDefaultMLSignatory();

  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    userId: row.user_id,
    status: row.status as MobileLadderInspection['status'],
    company: row.company ?? '',
    address: row.address ?? '',
    inspectorName: row.inspector_name ?? '',
    inspectionDate: row.inspection_date,
    ladderType: row.ladder_type,
    ladderTypeUnknown: row.ladder_type_unknown ?? false,
    model: row.model,
    modelUnknown: row.model_unknown ?? false,
    heightM: row.height_m,
    heightUnknown: row.height_unknown ?? false,
    maxLoadKg: row.max_load_kg,
    maxLoadUnknown: row.max_load_unknown ?? false,
    nextInspectionDate: row.next_inspection_date,
    items,
    verdict: (row.verdict as MobileLadderInspection['verdict']) ?? null,
    verdictComment: row.verdict_comment ?? '',
    summaryPhotos: Array.isArray(row.summary_photos) ? row.summary_photos : [],
    signature: {
      name: sig.name ?? '',
      position: sig.position ?? '',
      signature: sig.signature ?? null,
      date: sig.date ?? null,
    },
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// signature is ephemeral (memory-only) - never persisted via patch.
type MobileLadderPatch = Partial<{
  company: string;
  address: string;
  inspectorName: string;
  inspectionDate: string;
  ladderType: string | null;
  ladderTypeUnknown: boolean;
  model: string | null;
  modelUnknown: boolean;
  heightM: number | null;
  heightUnknown: boolean;
  maxLoadKg: number | null;
  maxLoadUnknown: boolean;
  nextInspectionDate: string | null;
  items: MLItemState[];
  verdict: MobileLadderInspection['verdict'];
  verdictComment: string;
  summaryPhotos: string[];
  signature: MLSignatory;
}>;

// Mechanical camel→snake writes; the ephemeral `signature` is intentionally
// absent (memory-only). See lib/inspection/rowMapper.ts.
const toDb = makeToDb<MobileLadderPatch>({
  company: 'company',
  address: 'address',
  inspectorName: 'inspector_name',
  inspectionDate: 'inspection_date',
  ladderType: 'ladder_type',
  ladderTypeUnknown: 'ladder_type_unknown',
  model: 'model',
  modelUnknown: 'model_unknown',
  heightM: 'height_m',
  heightUnknown: 'height_unknown',
  maxLoadKg: 'max_load_kg',
  maxLoadUnknown: 'max_load_unknown',
  nextInspectionDate: 'next_inspection_date',
  items: 'items',
  verdict: 'verdict',
  verdictComment: 'verdict_comment',
  summaryPhotos: 'summary_photos',
});

// ── API ───────────────────────────────────────────────────────────────────────

const base = makeInspectionService<MobileLadderInspection, MobileLadderPatch>({
  table: 'mobile_ladder_inspections',
  pathPrefix: 'mobile-ladder',
  inspectionType: 'mobile_ladder_inspection',
  toModel,
  toDb,
  createColumns: (args) => ({
    inspector_name: args.inspectorName ?? null,
    items: buildDefaultMLItems(),
    signature: {
      name: args.inspectorName ?? '',
      position: '',
      signature: null,
      date: null,
    },
  }),
});

export const mobileLadderApi = {
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
