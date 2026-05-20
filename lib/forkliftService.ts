import { supabase, STORAGE_BUCKETS } from './supabase';
import { storageApi } from './services';
import { logError } from './logError';
import type { ForkliftInspection, ForkliftItemState } from '../types/forklift';
import { buildDefaultForkliftItems } from '../types/forklift';
import * as Crypto from 'expo-crypto';

// ── DB ↔ model mapping ────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: string;
  company: string | null;
  address: string | null;
  inventory_number: string | null;
  brand_model: string | null;
  engine_type: string | null;
  inspection_date: string;
  inspector_name: string | null;
  items: ForkliftItemState[];
  verdict: string | null;
  notes: string | null;
  summary_photos: string[];
  qual_doc_path: string | null;
  signer_name: string | null;
  signer_position: string | null;
  signer_phone: string | null;
  signer_signature: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): ForkliftInspection {
  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    userId: row.user_id,
    status: row.status as ForkliftInspection['status'],
    company: row.company,
    address: row.address,
    inventoryNumber: row.inventory_number,
    brandModel: row.brand_model,
    engineType: (row.engine_type ?? null) as ForkliftInspection['engineType'],
    inspectionDate: row.inspection_date,
    inspectorName: row.inspector_name,
    items: Array.isArray(row.items) && row.items.length === 39
      ? row.items
      : buildDefaultForkliftItems(),
    verdict: (row.verdict ?? null) as ForkliftInspection['verdict'],
    notes: row.notes,
    summaryPhotos: Array.isArray(row.summary_photos) ? row.summary_photos : [],
    qualDocPath: row.qual_doc_path,
    signerName: row.signer_name,
    signerPosition: row.signer_position,
    signerPhone: row.signer_phone,
    signerSignature: row.signer_signature,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const forkliftApi = {
  create: async (args: {
    projectId: string;
    templateId: string;
    inspectorName?: string;
  }): Promise<ForkliftInspection> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const { data, error } = await supabase
      .from('forklift_inspections')
      .insert({
        project_id: args.projectId,
        template_id: args.templateId,
        user_id: user.id,
        inspection_date: new Date().toISOString().slice(0, 10),
        inspector_name: args.inspectorName ?? null,
        items: buildDefaultForkliftItems(),
        summary_photos: [],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  getById: async (id: string): Promise<ForkliftInspection | null> => {
    const { data, error } = await supabase
      .from('forklift_inspections')
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
      company: string | null;
      address: string | null;
      inventoryNumber: string | null;
      brandModel: string | null;
      engineType: ForkliftInspection['engineType'];
      inspectionDate: string;
      inspectorName: string | null;
      items: ForkliftItemState[];
      verdict: ForkliftInspection['verdict'];
      notes: string | null;
      summaryPhotos: string[];
      qualDocPath: string | null;
      signerName: string | null;
      signerPosition: string | null;
      signerPhone: string | null;
      signerSignature: string | null;
    }>,
  ): Promise<void> => {
    const db: Record<string, unknown> = {};
    if ('company'         in patch) db.company          = patch.company;
    if ('address'         in patch) db.address          = patch.address;
    if ('inventoryNumber' in patch) db.inventory_number = patch.inventoryNumber;
    if ('brandModel'      in patch) db.brand_model      = patch.brandModel;
    if ('engineType'      in patch) db.engine_type      = patch.engineType;
    if ('inspectionDate'  in patch) db.inspection_date  = patch.inspectionDate;
    if ('inspectorName'   in patch) db.inspector_name   = patch.inspectorName;
    if ('items'           in patch) db.items            = patch.items;
    if ('verdict'         in patch) db.verdict          = patch.verdict;
    if ('notes'           in patch) db.notes            = patch.notes;
    if ('summaryPhotos'   in patch) db.summary_photos   = patch.summaryPhotos;
    if ('qualDocPath'     in patch) db.qual_doc_path    = patch.qualDocPath;
    if ('signerName'      in patch) db.signer_name      = patch.signerName;
    if ('signerPosition'  in patch) db.signer_position  = patch.signerPosition;
    if ('signerPhone'     in patch) db.signer_phone     = patch.signerPhone;
    if ('signerSignature' in patch) db.signer_signature = patch.signerSignature;

    if (Object.keys(db).length === 0) return;
    const { error } = await supabase
      .from('forklift_inspections')
      .update(db)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  complete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('forklift_inspections')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  listByProject: async (projectId: string): Promise<ForkliftInspection[]> => {
    const { data, error } = await supabase
      .from('forklift_inspections')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
  },

  uploadPhoto: async (
    inspectionId: string,
    itemId: number,
    photoUri: string,
  ): Promise<string> => {
    const uuid = Crypto.randomUUID();
    const path = `forklift/${inspectionId}/${itemId}/${uuid}.jpg`;
    await storageApi.uploadFromUri(
      STORAGE_BUCKETS.answerPhotos,
      path,
      photoUri,
      'image/jpeg',
      'inspection',
    );
    return path;
  },

  uploadSummaryPhoto: async (
    inspectionId: string,
    photoUri: string,
  ): Promise<string> => {
    const uuid = Crypto.randomUUID();
    const path = `forklift/${inspectionId}/summary/${uuid}.jpg`;
    await storageApi.uploadFromUri(
      STORAGE_BUCKETS.answerPhotos,
      path,
      photoUri,
      'image/jpeg',
      'inspection',
    );
    return path;
  },

  uploadQualDoc: async (
    inspectionId: string,
    photoUri: string,
  ): Promise<string> => {
    const uuid = Crypto.randomUUID();
    const path = `forklift/${inspectionId}/qual-doc/${uuid}.jpg`;
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
      .catch((e) => logError(e, 'forklift.deletePhoto'));
  },
};
