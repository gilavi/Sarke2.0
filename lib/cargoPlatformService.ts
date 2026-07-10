import { makeInspectionService } from './inspection/service';
import { makeToDb } from './inspection/rowMapper';
import type { CargoPlatformInspection, CPItemState, CPCargoRow, CPSignatory } from '../types/cargoPlatform';
import { buildDefaultCPItems, buildDefaultCargoRow } from '../types/cargoPlatform';

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
  floor_zone: string | null;
  inspection_date: string;
  platform_type_model: string | null;
  platform_length_m: number | null;
  platform_width_m: number | null;
  platform_color_desc: string | null;
  side_guardrail: string | null;
  front_guardrail: string | null;
  guardrail_height: string | null;
  cargo: CPCargoRow[];
  items: CPItemState[];
  verdict: string | null;
  verdict_comment: string | null;
  summary_photos: string[];
  // Column dropped by 20260526002032_remove_persisted_inspection_signatures -
  // old clients may still see it absent; toModel synthesizes an empty slot.
  signatures?: CPSignatory[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): CargoPlatformInspection {
  const items: CPItemState[] = Array.isArray(row.items) && row.items.length === 9
    ? row.items
    : buildDefaultCPItems();

  const cargo: CPCargoRow[] = Array.isArray(row.cargo) && row.cargo.length > 0
    ? row.cargo
    : [buildDefaultCargoRow(), buildDefaultCargoRow(), buildDefaultCargoRow()];

  const emptySignatory = (): CPSignatory => ({ name: '', position: '', organization: '', signature: null, date: null });
  const rawSigs = row.signatures;
  const signatures: CPSignatory[] = Array.isArray(rawSigs)
    ? rawSigs.map(s => ({
        name: s?.name ?? '',
        position: s?.position ?? '',
        organization: s?.organization ?? '',
        signature: s?.signature ?? null,
        date: s?.date ?? null,
      }))
    : [emptySignatory()];

  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    userId: row.user_id,
    status: row.status as CargoPlatformInspection['status'],
    company: row.company ?? '',
    address: row.address ?? '',
    inspectorName: row.inspector_name ?? '',
    floorZone: row.floor_zone ?? '',
    inspectionDate: row.inspection_date,
    platformTypeModel: row.platform_type_model ?? '',
    platformLength: row.platform_length_m,
    platformWidth: row.platform_width_m,
    platformColorDesc: row.platform_color_desc ?? '',
    sideGuardrail: (row.side_guardrail as CargoPlatformInspection['sideGuardrail']) ?? null,
    frontGuardrail: (row.front_guardrail as CargoPlatformInspection['frontGuardrail']) ?? null,
    guardrailHeight: (row.guardrail_height as CargoPlatformInspection['guardrailHeight']) ?? null,
    cargo,
    items,
    verdict: (row.verdict as CargoPlatformInspection['verdict']) ?? null,
    verdictComment: row.verdict_comment ?? '',
    summaryPhotos: Array.isArray(row.summary_photos) ? row.summary_photos : [],
    signatures,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// signatures are ephemeral (memory-only) - never persisted via patch.
type CargoPlatformPatch = Partial<{
  company: string;
  address: string;
  inspectorName: string;
  floorZone: string;
  inspectionDate: string;
  platformTypeModel: string;
  platformLength: number | null;
  platformWidth: number | null;
  platformColorDesc: string;
  sideGuardrail: CargoPlatformInspection['sideGuardrail'];
  frontGuardrail: CargoPlatformInspection['frontGuardrail'];
  guardrailHeight: CargoPlatformInspection['guardrailHeight'];
  cargo: CPCargoRow[];
  items: CPItemState[];
  verdict: CargoPlatformInspection['verdict'];
  verdictComment: string;
  summaryPhotos: string[];
  signatures: CPSignatory[];
}>;

// Mechanical camel→snake writes; `signatures` is intentionally absent (the
// column was dropped from cargo_platform_inspections and signatures are
// memory-only). See lib/inspection/rowMapper.ts.
const toDb = makeToDb<CargoPlatformPatch>({
  company: 'company',
  address: 'address',
  inspectorName: 'inspector_name',
  floorZone: 'floor_zone',
  inspectionDate: 'inspection_date',
  platformTypeModel: 'platform_type_model',
  platformLength: 'platform_length_m',
  platformWidth: 'platform_width_m',
  platformColorDesc: 'platform_color_desc',
  sideGuardrail: 'side_guardrail',
  frontGuardrail: 'front_guardrail',
  guardrailHeight: 'guardrail_height',
  cargo: 'cargo',
  items: 'items',
  verdict: 'verdict',
  verdictComment: 'verdict_comment',
  summaryPhotos: 'summary_photos',
});

// ── API ───────────────────────────────────────────────────────────────────────

const base = makeInspectionService<CargoPlatformInspection, CargoPlatformPatch>({
  table: 'cargo_platform_inspections',
  pathPrefix: 'cargo-platform',
  inspectionType: 'cargo_platform',
  toModel,
  toDb,
  // NOTE: no `signatures` here - the column was dropped from
  // cargo_platform_inspections (20260526002032); sending it makes PostgREST
  // reject the whole insert ("could not find the 'signatures' column").
  // Signatures are memory-only (toModel synthesizes an empty slot).
  createColumns: (args) => ({
    inspector_name: args.inspectorName ?? null,
    items: buildDefaultCPItems(),
    cargo: [buildDefaultCargoRow(), buildDefaultCargoRow(), buildDefaultCargoRow()],
  }),
});

export const cargoPlatformApi = {
  create: base.create,
  getById: base.getById,
  listByProject: base.listByProject,
  patch: base.patch,
  complete: base.complete,
  reopen: base.reopen,
  deletePhoto: base.deletePhoto,
  uploadPhoto: (inspectionId: string, itemId: number | 'summary', photoUri: string) =>
    base.uploadPhotoAt(`${inspectionId}/${itemId}`, photoUri),
};
