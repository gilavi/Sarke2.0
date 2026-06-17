import { makeRepository, mapDefined } from '@/lib/db/repository';

export {
  LIFTING_ACCESSORIES_TEMPLATE_ID,
  LA_CHECKLIST_ITEMS,
  LA_SECTION_LABELS,
  LA_RESULT_TO_CHIP,
  LA_VERDICT_LABELS,
  LA_MARKING_OPTIONS,
  buildDefaultLAItems,
  type LAResult,
  type LAVerdict,
  type LAItemState,
  type LARemovedRow,
  type LiftingAccessoriesInspection,
} from '@/lib/types/liftingAccessories';

import {
  LIFTING_ACCESSORIES_TEMPLATE_ID,
  buildDefaultLAItems,
  type LAItemState,
  type LARemovedRow,
  type LAVerdict,
  type LiftingAccessoriesInspection,
} from '@/lib/types/liftingAccessories';

/**
 * Raw `lifting_accessories_inspections` row. The `signatures` column is never
 * read or written by the web layer (regulatory - captured signatures are not
 * persisted; they are rasterized into the PDF from in-memory state only).
 */
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
  equipment_types: string[] | null;
  equipment_type_other: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  year_of_manufacture: string | null;
  marking_status: string | null;
  wll_kg: string | null;
  unit_count: string | null;
  next_inspection_date: string | null;
  items: LAItemState[] | null;
  removed_rows: LARemovedRow[] | null;
  verdict: LAVerdict | null;
  verdict_comment: string | null;
  summary_photos: string[] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, company, address, inspector_name, inspection_date, equipment_types, equipment_type_other, serial_number, manufacturer, year_of_manufacture, marking_status, wll_kg, unit_count, next_inspection_date, items, removed_rows, verdict, verdict_comment, summary_photos, completed_at, created_at, updated_at';

function toModel(r: DbRow): LiftingAccessoriesInspection {
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
    equipmentTypes: r.equipment_types ?? [],
    equipmentTypeOther: r.equipment_type_other ?? '',
    serialNumber: r.serial_number ?? '',
    manufacturer: r.manufacturer ?? '',
    yearOfManufacture: r.year_of_manufacture ?? '',
    markingStatus: r.marking_status,
    wllKg: r.wll_kg ?? '',
    unitCount: r.unit_count ?? '',
    nextInspectionDate: r.next_inspection_date,
    items: r.items ?? [],
    removedRows: r.removed_rows ?? [],
    verdict: r.verdict,
    verdictComment: r.verdict_comment ?? '',
    summaryPhotos: r.summary_photos ?? [],
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface CreateLiftingAccessoriesArgs {
  projectId: string;
  templateId?: string;
  company?: string | null;
  address?: string | null;
  inspectorName?: string | null;
  inspectionDate?: string | null;
}

export type LiftingAccessoriesPatch = Partial<{
  company: string | null;
  address: string | null;
  inspectorName: string | null;
  inspectionDate: string | null;
  equipmentTypes: string[];
  equipmentTypeOther: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  yearOfManufacture: string | null;
  markingStatus: string | null;
  wllKg: string | null;
  unitCount: string | null;
  nextInspectionDate: string | null;
  items: LAItemState[];
  removedRows: LARemovedRow[];
  verdict: LAVerdict | null;
  verdictComment: string | null;
  summaryPhotos: string[];
  status: 'draft' | 'completed';
}>;

const repo = makeRepository<LiftingAccessoriesInspection, DbRow, CreateLiftingAccessoriesArgs, LiftingAccessoriesPatch>({
  table: 'lifting_accessories_inspections',
  columns: COLS,
  parentInspection: { type: 'lifting_accessories_inspection' },
  toModel,
  toInsert: (args, userId) => ({
    project_id: args.projectId,
    template_id: args.templateId ?? LIFTING_ACCESSORIES_TEMPLATE_ID,
    user_id: userId,
    status: 'draft',
    company: args.company ?? null,
    address: args.address ?? null,
    inspector_name: args.inspectorName ?? null,
    ...(args.inspectionDate ? { inspection_date: args.inspectionDate } : {}),
    items: buildDefaultLAItems(),
  }),
  toUpdate: (patch) => {
    const row = mapDefined(patch, {
      company: 'company',
      address: 'address',
      inspectorName: 'inspector_name',
      inspectionDate: 'inspection_date',
      equipmentTypes: 'equipment_types',
      equipmentTypeOther: 'equipment_type_other',
      serialNumber: 'serial_number',
      manufacturer: 'manufacturer',
      yearOfManufacture: 'year_of_manufacture',
      markingStatus: 'marking_status',
      wllKg: 'wll_kg',
      unitCount: 'unit_count',
      nextInspectionDate: 'next_inspection_date',
      items: 'items',
      removedRows: 'removed_rows',
      verdict: 'verdict',
      verdictComment: 'verdict_comment',
      summaryPhotos: 'summary_photos',
    });
    if (patch.status !== undefined) {
      row.status = patch.status;
      if (patch.status === 'completed') row.completed_at = new Date().toISOString();
    }
    return row;
  },
});

export const listLiftingAccessoriesInspections = (projectId?: string): Promise<LiftingAccessoriesInspection[]> =>
  repo.list(projectId);
export const getLiftingAccessoriesInspection = (id: string): Promise<LiftingAccessoriesInspection | null> =>
  repo.get(id);
export const createLiftingAccessoriesInspection = (
  args: CreateLiftingAccessoriesArgs,
): Promise<LiftingAccessoriesInspection> => repo.create(args);
export const updateLiftingAccessoriesInspection = (id: string, patch: LiftingAccessoriesPatch): Promise<void> =>
  repo.update(id, patch);
export const deleteLiftingAccessoriesInspection = (id: string): Promise<void> => repo.remove(id);
