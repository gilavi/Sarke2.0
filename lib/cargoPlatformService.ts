import { supabase, STORAGE_BUCKETS } from './supabase';
import { storageApi } from './services';
import { logError } from './logError';
import * as Crypto from 'expo-crypto';
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
  signatures: CPSignatory[];
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

// ── API ───────────────────────────────────────────────────────────────────────

export const cargoPlatformApi = {
  create: async (args: {
    projectId: string;
    templateId: string;
    inspectorName?: string;
  }): Promise<CargoPlatformInspection> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const emptySignatory = (): CPSignatory => ({ name: args.inspectorName ?? '', position: '', organization: '', signature: null, date: null });
    const { data, error } = await supabase
      .from('cargo_platform_inspections')
      .insert({
        project_id: args.projectId,
        template_id: args.templateId,
        user_id: user.id,
        inspection_date: new Date().toISOString().slice(0, 10),
        inspector_name: args.inspectorName ?? null,
        items: buildDefaultCPItems(),
        cargo: [buildDefaultCargoRow(), buildDefaultCargoRow(), buildDefaultCargoRow()],
        signatures: [emptySignatory()],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  getById: async (id: string): Promise<CargoPlatformInspection | null> => {
    const { data, error } = await supabase
      .from('cargo_platform_inspections')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toModel(data as DbRow);
  },

  patch: async (
    id: string,
    patch: Partial<{
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
    }>,
  ): Promise<void> => {
    const db: Record<string, unknown> = {};
    if ('company'           in patch) db.company              = patch.company;
    if ('address'           in patch) db.address              = patch.address;
    if ('inspectorName'     in patch) db.inspector_name       = patch.inspectorName;
    if ('floorZone'         in patch) db.floor_zone           = patch.floorZone;
    if ('inspectionDate'    in patch) db.inspection_date      = patch.inspectionDate;
    if ('platformTypeModel' in patch) db.platform_type_model  = patch.platformTypeModel;
    if ('platformLength'    in patch) db.platform_length_m    = patch.platformLength;
    if ('platformWidth'     in patch) db.platform_width_m     = patch.platformWidth;
    if ('platformColorDesc' in patch) db.platform_color_desc  = patch.platformColorDesc;
    if ('sideGuardrail'     in patch) db.side_guardrail       = patch.sideGuardrail;
    if ('frontGuardrail'    in patch) db.front_guardrail      = patch.frontGuardrail;
    if ('guardrailHeight'   in patch) db.guardrail_height     = patch.guardrailHeight;
    if ('cargo'             in patch) db.cargo                = patch.cargo;
    if ('items'             in patch) db.items                = patch.items;
    if ('verdict'           in patch) db.verdict              = patch.verdict;
    if ('verdictComment'    in patch) db.verdict_comment      = patch.verdictComment;
    if ('summaryPhotos'     in patch) db.summary_photos       = patch.summaryPhotos;
    // Signatures are ephemeral (memory-only) — never persist to DB

    if (Object.keys(db).length === 0) return;
    const { error } = await supabase
      .from('cargo_platform_inspections')
      .update(db)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  complete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('cargo_platform_inspections')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  listByProject: async (projectId: string): Promise<CargoPlatformInspection[]> => {
    const { data, error } = await supabase
      .from('cargo_platform_inspections')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
  },

  uploadPhoto: async (
    inspectionId: string,
    itemId: number | 'summary',
    photoUri: string,
  ): Promise<string> => {
    const uuid = Crypto.randomUUID();
    const path = `cargo-platform/${inspectionId}/${itemId}/${uuid}.jpg`;
    await storageApi.uploadFromUri(
      STORAGE_BUCKETS.answerPhotos,
      path,
      photoUri,
      'image/jpeg',
      'inspection',
    );
    return path;
  },

  deletePhoto: async (path: string): Promise<void> => {
    await storageApi.remove(STORAGE_BUCKETS.answerPhotos, path)
      .catch((e) => logError(e, 'cargoPlatform.deletePhoto'));
  },
};
