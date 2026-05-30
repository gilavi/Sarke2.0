import { makeRepository, mapDefined } from '@/lib/db/repository';

export {
  FORKLIFT_TEMPLATE_ID,
  FORKLIFT_ITEMS,
  FORKLIFT_CATEGORY_LABELS,
  FORKLIFT_VERDICT_LABEL,
  ENGINE_TYPE_LABEL,
  buildDefaultForkliftItems,
  type ForkliftItemResult,
  type ForkliftVerdict,
  type ForkliftCategory,
  type ForkliftEngineType,
  type ForkliftItemState,
  type ForkliftInspection,
} from '@/lib/types/forklift';

import {
  FORKLIFT_TEMPLATE_ID,
  buildDefaultForkliftItems,
  type ForkliftItemState,
  type ForkliftVerdict,
  type ForkliftEngineType,
  type ForkliftInspection,
} from '@/lib/types/forklift';

interface DbRow {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: 'draft' | 'completed';
  company: string | null;
  address: string | null;
  inventory_number: string | null;
  brand_model: string | null;
  engine_type: ForkliftEngineType | null;
  inspection_date: string;
  inspector_name: string | null;
  items: ForkliftItemState[] | null;
  verdict: ForkliftVerdict | null;
  notes: string | null;
  summary_photos: string[] | null;
  qual_doc_path: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, company, address, inventory_number, brand_model, engine_type, inspection_date, inspector_name, items, verdict, notes, summary_photos, qual_doc_path, completed_at, created_at, updated_at';

function toModel(r: DbRow): ForkliftInspection {
  return {
    id: r.id,
    projectId: r.project_id,
    templateId: r.template_id,
    userId: r.user_id,
    status: r.status,
    company: r.company,
    address: r.address,
    inventoryNumber: r.inventory_number,
    brandModel: r.brand_model,
    engineType: r.engine_type,
    inspectionDate: r.inspection_date,
    inspectorName: r.inspector_name,
    items: r.items ?? [],
    verdict: r.verdict,
    notes: r.notes,
    summaryPhotos: r.summary_photos ?? [],
    qualDocPath: r.qual_doc_path,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface CreateForkliftArgs {
  projectId: string;
  templateId?: string;
  company?: string | null;
  address?: string | null;
  inspectorName?: string | null;
  inspectionDate?: string | null;
}

export type ForkliftPatch = Partial<{
  company: string | null;
  address: string | null;
  inventoryNumber: string | null;
  brandModel: string | null;
  engineType: ForkliftEngineType | null;
  inspectionDate: string | null;
  inspectorName: string | null;
  items: ForkliftItemState[];
  verdict: ForkliftVerdict | null;
  notes: string | null;
  summaryPhotos: string[];
  qualDocPath: string | null;
  status: 'draft' | 'completed';
}>;

const repo = makeRepository<ForkliftInspection, DbRow, CreateForkliftArgs, ForkliftPatch>({
  table: 'forklift_inspections',
  columns: COLS,
  parentInspection: { type: 'forklift_inspection' },
  toModel,
  toInsert: (args, userId) => ({
    project_id: args.projectId,
    template_id: args.templateId ?? FORKLIFT_TEMPLATE_ID,
    user_id: userId,
    status: 'draft',
    company: args.company ?? null,
    address: args.address ?? null,
    inspector_name: args.inspectorName ?? null,
    ...(args.inspectionDate ? { inspection_date: args.inspectionDate } : {}),
    items: buildDefaultForkliftItems(),
  }),
  toUpdate: (patch) => {
    const row = mapDefined(patch, {
      company: 'company',
      address: 'address',
      inventoryNumber: 'inventory_number',
      brandModel: 'brand_model',
      engineType: 'engine_type',
      inspectionDate: 'inspection_date',
      inspectorName: 'inspector_name',
      items: 'items',
      verdict: 'verdict',
      notes: 'notes',
      summaryPhotos: 'summary_photos',
      qualDocPath: 'qual_doc_path',
    });
    if (patch.status !== undefined) {
      row.status = patch.status;
      if (patch.status === 'completed') row.completed_at = new Date().toISOString();
    }
    return row;
  },
});

export const listForkliftInspections = (projectId?: string): Promise<ForkliftInspection[]> =>
  repo.list(projectId);
export const getForkliftInspection = (id: string): Promise<ForkliftInspection | null> => repo.get(id);
export const createForkliftInspection = (args: CreateForkliftArgs): Promise<ForkliftInspection> =>
  repo.create(args);
export const updateForkliftInspection = (id: string, patch: ForkliftPatch): Promise<void> =>
  repo.update(id, patch);
export const deleteForkliftInspection = (id: string): Promise<void> => repo.remove(id);
