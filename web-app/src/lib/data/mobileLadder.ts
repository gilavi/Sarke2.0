import { makeRepository, mapDefined } from '@/lib/db/repository';

export {
  MOBILE_LADDER_TEMPLATE_ID,
  ML_CHECKLIST_ITEMS,
  ML_SECTION_LABELS,
  ML_RESULT_TO_CHIP,
  ML_VERDICT_LABELS,
  buildDefaultMLItems,
  type MLResult,
  type MLVerdict,
  type MLItemState,
  type MobileLadderInspection,
} from '@/lib/types/mobileLadder';

import {
  MOBILE_LADDER_TEMPLATE_ID,
  buildDefaultMLItems,
  type MLItemState,
  type MLVerdict,
  type MobileLadderInspection,
} from '@/lib/types/mobileLadder';

interface DbRow {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: 'draft' | 'completed';
  company: string | null;
  address: string | null;
  inspector_name: string | null;
  inspection_date: string;
  ladder_type: string | null;
  model: string | null;
  height_m: number | null;
  max_load_kg: number | null;
  next_inspection_date: string | null;
  items: MLItemState[] | null;
  verdict: MLVerdict | null;
  verdict_comment: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, company, address, inspector_name, inspection_date, ladder_type, model, height_m, max_load_kg, next_inspection_date, items, verdict, verdict_comment, completed_at, created_at, updated_at';

function toModel(r: DbRow): MobileLadderInspection {
  return {
    id: r.id,
    projectId: r.project_id,
    templateId: r.template_id,
    userId: r.user_id,
    status: r.status,
    company: r.company ?? '',
    address: r.address ?? '',
    inspectorName: r.inspector_name ?? '',
    inspectionDate: r.inspection_date,
    ladderType: r.ladder_type,
    model: r.model,
    heightM: r.height_m,
    maxLoadKg: r.max_load_kg,
    nextInspectionDate: r.next_inspection_date,
    items: r.items ?? [],
    verdict: r.verdict,
    verdictComment: r.verdict_comment ?? '',
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface CreateMobileLadderArgs {
  projectId: string;
  templateId?: string;
  company?: string | null;
  address?: string | null;
  inspectorName?: string | null;
  inspectionDate?: string | null;
}

export type MobileLadderPatch = Partial<{
  company: string | null;
  address: string | null;
  inspectorName: string | null;
  inspectionDate: string | null;
  ladderType: string | null;
  model: string | null;
  heightM: number | null;
  maxLoadKg: number | null;
  nextInspectionDate: string | null;
  items: MLItemState[];
  verdict: MLVerdict | null;
  verdictComment: string | null;
  status: 'draft' | 'completed';
}>;

const repo = makeRepository<MobileLadderInspection, DbRow, CreateMobileLadderArgs, MobileLadderPatch>({
  table: 'mobile_ladder_inspections',
  columns: COLS,
  parentInspection: { type: 'mobile_ladder_inspection' },
  toModel,
  toInsert: (args, userId) => ({
    project_id: args.projectId,
    template_id: args.templateId ?? MOBILE_LADDER_TEMPLATE_ID,
    user_id: userId,
    status: 'draft',
    company: args.company ?? null,
    address: args.address ?? null,
    inspector_name: args.inspectorName ?? null,
    ...(args.inspectionDate ? { inspection_date: args.inspectionDate } : {}),
    items: buildDefaultMLItems(),
  }),
  toUpdate: (patch) => {
    const row = mapDefined(patch, {
      company: 'company',
      address: 'address',
      inspectorName: 'inspector_name',
      inspectionDate: 'inspection_date',
      ladderType: 'ladder_type',
      model: 'model',
      heightM: 'height_m',
      maxLoadKg: 'max_load_kg',
      nextInspectionDate: 'next_inspection_date',
      items: 'items',
      verdict: 'verdict',
      verdictComment: 'verdict_comment',
    });
    if (patch.status !== undefined) {
      row.status = patch.status;
      if (patch.status === 'completed') row.completed_at = new Date().toISOString();
    }
    return row;
  },
});

export const listMobileLadderInspections = (projectId?: string): Promise<MobileLadderInspection[]> =>
  repo.list(projectId);
export const getMobileLadderInspection = (id: string): Promise<MobileLadderInspection | null> => repo.get(id);
export const createMobileLadderInspection = (args: CreateMobileLadderArgs): Promise<MobileLadderInspection> =>
  repo.create(args);
export const updateMobileLadderInspection = (id: string, patch: MobileLadderPatch): Promise<void> =>
  repo.update(id, patch);
export const deleteMobileLadderInspection = (id: string): Promise<void> => repo.remove(id);
