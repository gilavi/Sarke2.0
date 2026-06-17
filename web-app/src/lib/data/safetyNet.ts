import { makeRepository, mapDefined } from '@/lib/db/repository';

// Re-export the catalog + shapes so callers import from one place (mirrors the
// bobcat/excavator data modules).
export {
  SAFETY_NET_TEMPLATE_ID,
  SN_VISUAL_ITEMS,
  SN_POST_TEST_ITEMS,
  SN_VERDICT_LABEL,
  buildDefaultSNItems,
  buildDefaultSNPostTestItems,
  buildDefaultSNLoadTestRow,
  computeSNVerdictSuggestion,
  snTotalWeight,
  type SNResult,
  type SNPostResult,
  type SNVerdict,
  type SNItemState,
  type SNPostTestState,
  type SNLoadTestRow,
  type SafetyNetInspection,
} from '@/lib/types/safetyNet';

import {
  SAFETY_NET_TEMPLATE_ID,
  buildDefaultSNItems,
  buildDefaultSNPostTestItems,
  buildDefaultSNLoadTestRow,
  type SNItemState,
  type SNPostTestState,
  type SNLoadTestRow,
  type SNVerdict,
  type SafetyNetInspection,
} from '@/lib/types/safetyNet';

/**
 * Raw `safety_net_inspections` row (migration 0044). The web data layer never
 * reads or writes the `signatures` column - captured inspection signatures are
 * never persisted (regulatory); they live in result-screen state only and are
 * rasterized into the PDF via the in-memory signature session.
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
  manufacturer: string | null;
  net_size: string | null;
  post_size: string | null;
  post_count: number | null;
  post_anchor_count: number | null;
  anchor_point_count: number | null;
  edge_rope_count: number | null;
  cell_side: string | null;
  working_distance: string | null;
  certificate: 'none' | 'active' | 'expired' | null;
  items: SNItemState[] | null;
  load_test_rows: SNLoadTestRow[] | null;
  post_test_items: SNPostTestState[] | null;
  verdict: SNVerdict | null;
  verdict_comment: string | null;
  qual_doc_path: string | null;
  summary_photos: string[] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, company, address, inspector_name, inspection_date, manufacturer, net_size, post_size, post_count, post_anchor_count, anchor_point_count, edge_rope_count, cell_side, working_distance, certificate, items, load_test_rows, post_test_items, verdict, verdict_comment, qual_doc_path, summary_photos, completed_at, created_at, updated_at';

function toModel(r: DbRow): SafetyNetInspection {
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
    manufacturer: r.manufacturer ?? '',
    netSize: r.net_size ?? '',
    postSize: r.post_size ?? '',
    postCount: r.post_count,
    postAnchorCount: r.post_anchor_count,
    anchorPointCount: r.anchor_point_count,
    edgeRopeCount: r.edge_rope_count,
    cellSide: r.cell_side ?? '',
    workingDistance: r.working_distance ?? '',
    certificate: r.certificate,
    items: r.items ?? [],
    loadTestRows: r.load_test_rows ?? [],
    postTestItems: r.post_test_items ?? [],
    verdict: r.verdict,
    verdictComment: r.verdict_comment ?? '',
    // Never persisted - see DbRow comment.
    signatures: [],
    qualDocPath: r.qual_doc_path,
    summaryPhotos: r.summary_photos ?? [],
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface CreateSafetyNetArgs {
  projectId: string;
  templateId?: string;
  company?: string | null;
  address?: string | null;
  inspectorName?: string | null;
  inspectionDate?: string | null;
}

export type SafetyNetPatch = Partial<{
  company: string | null;
  address: string | null;
  inspectorName: string | null;
  inspectionDate: string | null;
  manufacturer: string | null;
  netSize: string | null;
  postSize: string | null;
  postCount: number | null;
  postAnchorCount: number | null;
  anchorPointCount: number | null;
  edgeRopeCount: number | null;
  cellSide: string | null;
  workingDistance: string | null;
  certificate: 'none' | 'active' | 'expired' | null;
  items: SNItemState[];
  loadTestRows: SNLoadTestRow[];
  postTestItems: SNPostTestState[];
  verdict: SNVerdict | null;
  verdictComment: string | null;
  qualDocPath: string | null;
  summaryPhotos: string[];
  status: 'draft' | 'completed';
}>;

const repo = makeRepository<SafetyNetInspection, DbRow, CreateSafetyNetArgs, SafetyNetPatch>({
  table: 'safety_net_inspections',
  columns: COLS,
  parentInspection: { type: 'safety_net_inspection' },
  toModel,
  toInsert: (args, userId) => ({
    project_id: args.projectId,
    template_id: args.templateId ?? SAFETY_NET_TEMPLATE_ID,
    user_id: userId,
    status: 'draft',
    company: args.company ?? null,
    address: args.address ?? null,
    inspector_name: args.inspectorName ?? null,
    ...(args.inspectionDate ? { inspection_date: args.inspectionDate } : {}),
    items: buildDefaultSNItems(),
    load_test_rows: [buildDefaultSNLoadTestRow(), buildDefaultSNLoadTestRow(), buildDefaultSNLoadTestRow()],
    post_test_items: buildDefaultSNPostTestItems(),
  }),
  toUpdate: (patch) => {
    const row = mapDefined(patch, {
      company: 'company',
      address: 'address',
      inspectorName: 'inspector_name',
      inspectionDate: 'inspection_date',
      manufacturer: 'manufacturer',
      netSize: 'net_size',
      postSize: 'post_size',
      postCount: 'post_count',
      postAnchorCount: 'post_anchor_count',
      anchorPointCount: 'anchor_point_count',
      edgeRopeCount: 'edge_rope_count',
      cellSide: 'cell_side',
      workingDistance: 'working_distance',
      certificate: 'certificate',
      items: 'items',
      loadTestRows: 'load_test_rows',
      postTestItems: 'post_test_items',
      verdict: 'verdict',
      verdictComment: 'verdict_comment',
      qualDocPath: 'qual_doc_path',
      summaryPhotos: 'summary_photos',
    });
    if (patch.status !== undefined) {
      row.status = patch.status;
      if (patch.status === 'completed') row.completed_at = new Date().toISOString();
    }
    return row;
  },
});

export const listSafetyNetInspections = (projectId?: string): Promise<SafetyNetInspection[]> =>
  repo.list(projectId);
export const getSafetyNetInspection = (id: string): Promise<SafetyNetInspection | null> => repo.get(id);
export const createSafetyNetInspection = (args: CreateSafetyNetArgs): Promise<SafetyNetInspection> =>
  repo.create(args);
export const updateSafetyNetInspection = (id: string, patch: SafetyNetPatch): Promise<void> =>
  repo.update(id, patch);
export const deleteSafetyNetInspection = (id: string): Promise<void> => repo.remove(id);
