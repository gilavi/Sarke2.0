import { supabase, STORAGE_BUCKETS } from './supabase';
import { storageApi } from './services';
import { logError } from './logError';
import * as Crypto from 'expo-crypto';
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

// ── API ───────────────────────────────────────────────────────────────────────

export const mobileLadderApi = {
  create: async (args: {
    projectId: string;
    templateId: string;
    inspectorName?: string;
  }): Promise<MobileLadderInspection> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const { data, error } = await supabase
      .from('mobile_ladder_inspections')
      .insert({
        project_id: args.projectId,
        template_id: args.templateId,
        user_id: user.id,
        inspection_date: new Date().toISOString().slice(0, 10),
        inspector_name: args.inspectorName ?? null,
        items: buildDefaultMLItems(),
        signature: {
          name: args.inspectorName ?? '',
          position: '',
          signature: null,
          date: null,
        },
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  getById: async (id: string): Promise<MobileLadderInspection | null> => {
    const { data, error } = await supabase
      .from('mobile_ladder_inspections')
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
      signature: MLSignatory;
    }>,
  ): Promise<void> => {
    const db: Record<string, unknown> = {};
    if ('company'             in patch) db.company              = patch.company;
    if ('address'             in patch) db.address              = patch.address;
    if ('inspectorName'       in patch) db.inspector_name       = patch.inspectorName;
    if ('inspectionDate'      in patch) db.inspection_date      = patch.inspectionDate;
    if ('ladderType'          in patch) db.ladder_type          = patch.ladderType;
    if ('ladderTypeUnknown'   in patch) db.ladder_type_unknown  = patch.ladderTypeUnknown;
    if ('model'               in patch) db.model                = patch.model;
    if ('modelUnknown'        in patch) db.model_unknown        = patch.modelUnknown;
    if ('heightM'             in patch) db.height_m             = patch.heightM;
    if ('heightUnknown'       in patch) db.height_unknown       = patch.heightUnknown;
    if ('maxLoadKg'           in patch) db.max_load_kg          = patch.maxLoadKg;
    if ('maxLoadUnknown'      in patch) db.max_load_unknown     = patch.maxLoadUnknown;
    if ('nextInspectionDate'  in patch) db.next_inspection_date = patch.nextInspectionDate;
    if ('items'               in patch) db.items                = patch.items;
    if ('verdict'             in patch) db.verdict              = patch.verdict;
    if ('verdictComment'      in patch) db.verdict_comment      = patch.verdictComment;
    if ('signature'           in patch) db.signature            = patch.signature;

    if (Object.keys(db).length === 0) return;
    const { error } = await supabase
      .from('mobile_ladder_inspections')
      .update(db)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  complete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('mobile_ladder_inspections')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  listByProject: async (projectId: string): Promise<MobileLadderInspection[]> => {
    const { data, error } = await supabase
      .from('mobile_ladder_inspections')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
  },

  /**
   * Uploads a checklist item photo.
   * @param itemId - checklist item id (1–8)
   * @returns storage path in the answer-photos bucket
   */
  uploadPhoto: async (
    inspectionId: string,
    itemId: number,
    photoUri: string,
  ): Promise<string> => {
    const uuid = Crypto.randomUUID();
    const path = `mobile-ladder/${inspectionId}/${itemId}/${uuid}.jpg`;
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
      .catch((e) => logError(e, 'mobileLadder.deletePhoto'));
  },
};
