import { makeRepository, mapDefined } from '@/lib/db/repository';

// Re-export the canonical mobile checklist so web stays in sync.
export {
  BOBCAT_ITEMS,
  LARGE_LOADER_ITEMS,
  BOBCAT_TEMPLATE_ID,
  LARGE_LOADER_TEMPLATE_ID,
  type BobcatChecklistEntry,
  type BobcatItemResult,
  type BobcatInspectionType,
  type BobcatVerdict,
  type BobcatItemState,
  type BobcatInspection,
} from '@/lib/types/bobcat';

import type {
  BobcatInspection,
  BobcatInspectionType,
  BobcatItemState,
  BobcatVerdict,
} from '@/lib/types/bobcat';
import type { SignatoryEntry } from '@/lib/data/inspections';
import { BOBCAT_ITEMS } from '@/lib/types/bobcat';

interface DbRow {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: 'draft' | 'completed';
  company: string | null;
  address: string | null;
  equipment_model: string | null;
  registration_number: string | null;
  inspection_date: string;
  inspection_type: BobcatInspectionType | null;
  department: string | null;
  inspector_name: string | null;
  items: BobcatItemState[] | null;
  verdict: BobcatVerdict | null;
  notes: string | null;
  inspector_signature: string | null;
  signatories: SignatoryEntry[] | null;
  summary_photos: string[] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, company, address, equipment_model, registration_number, inspection_date, inspection_type, department, inspector_name, items, verdict, notes, inspector_signature, signatories, summary_photos, completed_at, created_at, updated_at';

function toModel(r: DbRow): BobcatInspection {
  return {
    id: r.id,
    projectId: r.project_id,
    templateId: r.template_id,
    userId: r.user_id,
    status: r.status,
    company: r.company,
    address: r.address,
    equipmentModel: r.equipment_model,
    registrationNumber: r.registration_number,
    inspectionDate: r.inspection_date,
    inspectionType: r.inspection_type,
    department: r.department,
    inspectorName: r.inspector_name,
    items: r.items ?? [],
    verdict: r.verdict,
    notes: r.notes,
    inspectorSignature: r.inspector_signature,
    signatories: r.signatories ?? [],
    summaryPhotos: r.summary_photos ?? [],
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function emptyItems(): BobcatItemState[] {
  return BOBCAT_ITEMS.map((it) => ({
    id: it.id,
    result: null,
    comment: null,
    photo_paths: [],
  }));
}

export interface CreateBobcatArgs {
  projectId: string;
  templateId: string;
  company?: string | null;
  equipmentModel?: string | null;
  registrationNumber?: string | null;
  inspectionType?: BobcatInspectionType | null;
  department?: string | null;
  inspectorName?: string | null;
  inspectionDate?: string | null;
}

export type BobcatPatch = Partial<{
  company: string | null;
  address: string | null;
  equipmentModel: string | null;
  registrationNumber: string | null;
  inspectionType: BobcatInspectionType | null;
  department: string | null;
  inspectorName: string | null;
  items: BobcatItemState[];
  verdict: BobcatVerdict | null;
  notes: string | null;
  inspectorSignature: string | null;
  signatories: SignatoryEntry[];
  summaryPhotos: string[];
  status: 'draft' | 'completed';
}>;

const repo = makeRepository<BobcatInspection, DbRow, CreateBobcatArgs, BobcatPatch>({
  table: 'bobcat_inspections',
  columns: COLS,
  toModel,
  toInsert: (args, userId) => ({
    project_id: args.projectId,
    template_id: args.templateId,
    user_id: userId,
    status: 'draft',
    company: args.company ?? null,
    equipment_model: args.equipmentModel ?? null,
    registration_number: args.registrationNumber ?? null,
    inspection_type: args.inspectionType ?? null,
    department: args.department ?? null,
    inspector_name: args.inspectorName ?? null,
    ...(args.inspectionDate ? { inspection_date: args.inspectionDate } : {}),
    items: emptyItems(),
  }),
  toUpdate: (patch) => {
    const row = mapDefined(patch, {
      company: 'company',
      address: 'address',
      equipmentModel: 'equipment_model',
      registrationNumber: 'registration_number',
      inspectionType: 'inspection_type',
      department: 'department',
      inspectorName: 'inspector_name',
      items: 'items',
      verdict: 'verdict',
      notes: 'notes',
      inspectorSignature: 'inspector_signature',
      signatories: 'signatories',
      summaryPhotos: 'summary_photos',
    });
    if (patch.status !== undefined) {
      row.status = patch.status;
      if (patch.status === 'completed') row.completed_at = new Date().toISOString();
    }
    return row;
  },
});

export const listBobcatInspections = (projectId?: string): Promise<BobcatInspection[]> =>
  repo.list(projectId);
export const getBobcatInspection = (id: string): Promise<BobcatInspection | null> => repo.get(id);
export const createBobcatInspection = (args: CreateBobcatArgs): Promise<BobcatInspection> =>
  repo.create(args);
export const updateBobcatInspection = (id: string, patch: BobcatPatch): Promise<void> =>
  repo.update(id, patch);
export const deleteBobcatInspection = (id: string): Promise<void> => repo.remove(id);
