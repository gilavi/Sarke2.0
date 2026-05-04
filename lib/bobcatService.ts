import { supabase, STORAGE_BUCKETS } from './supabase';
import { storageApi } from './services';
import { logError } from './logError';
import type { BobcatInspection, BobcatItemState } from '../types/bobcat';
import {
  buildDefaultItems,
  LARGE_LOADER_TEMPLATE_ID,
  LARGE_LOADER_ITEMS,
} from '../types/bobcat';
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
  equipment_model: string | null;
  registration_number: string | null;
  inspection_date: string;
  inspection_type: string | null;
  inspector_name: string | null;
  items: BobcatItemState[];
  verdict: string | null;
  notes: string | null;
  inspector_signature: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function catalogFor(templateId: string | null) {
  return templateId === LARGE_LOADER_TEMPLATE_ID ? LARGE_LOADER_ITEMS : undefined;
}

function toModel(row: DbRow): BobcatInspection {
  const catalog = catalogFor(row.template_id);
  const expectedLength = (catalog ?? []).length || 30;
  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    userId: row.user_id,
    status: row.status as BobcatInspection['status'],
    company: row.company,
    address: row.address,
    equipmentModel: row.equipment_model,
    registrationNumber: row.registration_number,
    inspectionDate: row.inspection_date,
    inspectionType: (row.inspection_type ?? null) as BobcatInspection['inspectionType'],
    inspectorName: row.inspector_name,
    items: Array.isArray(row.items) && row.items.length === expectedLength
      ? row.items
      : buildDefaultItems(catalog),
    verdict: (row.verdict ?? null) as BobcatInspection['verdict'],
    notes: row.notes,
    inspectorSignature: row.inspector_signature,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const bobcatApi = {
  create: async (args: {
    projectId: string;
    templateId: string;
    inspectorName?: string;
  }): Promise<BobcatInspection> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const catalog = catalogFor(args.templateId);

    const { data, error } = await supabase
      .from('bobcat_inspections')
      .insert({
        project_id: args.projectId,
        template_id: args.templateId,
        user_id: user.id,
        inspection_date: new Date().toISOString().slice(0, 10),
        inspector_name: args.inspectorName ?? null,
        items: buildDefaultItems(catalog),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  getById: async (id: string): Promise<BobcatInspection | null> => {
    const { data, error } = await supabase
      .from('bobcat_inspections')
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
      equipmentModel: string | null;
      registrationNumber: string | null;
      inspectionDate: string;
      inspectionType: BobcatInspection['inspectionType'];
      inspectorName: string | null;
      items: BobcatItemState[];
      verdict: BobcatInspection['verdict'];
      notes: string | null;
      inspectorSignature: string | null;
    }>,
  ): Promise<void> => {
    const db: Record<string, unknown> = {};
    if ('company'            in patch) db.company             = patch.company;
    if ('address'            in patch) db.address             = patch.address;
    if ('equipmentModel'     in patch) db.equipment_model     = patch.equipmentModel;
    if ('registrationNumber' in patch) db.registration_number = patch.registrationNumber;
    if ('inspectionDate'     in patch) db.inspection_date     = patch.inspectionDate;
    if ('inspectionType'     in patch) db.inspection_type     = patch.inspectionType;
    if ('inspectorName'      in patch) db.inspector_name      = patch.inspectorName;
    if ('items'              in patch) db.items               = patch.items;
    if ('verdict'            in patch) db.verdict             = patch.verdict;
    if ('notes'              in patch) db.notes               = patch.notes;
    if ('inspectorSignature' in patch) db.inspector_signature = patch.inspectorSignature;

    if (Object.keys(db).length === 0) return;
    const { error } = await supabase
      .from('bobcat_inspections')
      .update(db)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  complete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('bobcat_inspections')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  listByProject: async (projectId: string): Promise<BobcatInspection[]> => {
    const { data, error } = await supabase
      .from('bobcat_inspections')
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
    const path = `bobcat/${inspectionId}/${itemId}/${uuid}.jpg`;
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
    const path = `bobcat/${inspectionId}/summary/${uuid}.jpg`;
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
      .catch((e) => logError(e, 'bobcat.deletePhoto'));
  },
};
