import { supabase, STORAGE_BUCKETS } from './supabase';
import { storageApi } from './services';
import { logError } from './logError';
import * as Crypto from 'expo-crypto';
import type {
  LiftingAccessoriesInspection,
  LAItemState,
  LASignatory,
  LARemovedRow,
} from '../types/liftingAccessories';
import {
  buildDefaultLAItems,
} from '../types/liftingAccessories';

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
  equipment_types: string[];
  equipment_type_other: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  year_of_manufacture: string | null;
  marking_status: string | null;
  wll_kg: string | null;
  unit_count: string | null;
  next_inspection_date: string | null;
  items: LAItemState[];
  removed_rows: LARemovedRow[];
  verdict: string | null;
  verdict_comment: string | null;
  signatures: [LASignatory, LASignatory];
  summary_photos: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function normSig(raw: unknown): LASignatory {
  if (raw && typeof raw === 'object') {
    const s = raw as Record<string, unknown>;
    return {
      name:         typeof s.name         === 'string' ? s.name         : '',
      position:     typeof s.position     === 'string' ? s.position     : '',
      organization: typeof s.organization === 'string' ? s.organization : '',
      extra:        s.extra && typeof s.extra === 'object' ? (s.extra as Record<string, string>) : {},
      signature:    typeof s.signature    === 'string' ? s.signature    : null,
      date:         typeof s.date         === 'string' ? s.date         : null,
    };
  }
  return { name: '', position: '', organization: '', extra: {}, signature: null, date: null };
}

function toModel(row: DbRow): LiftingAccessoriesInspection {
  const items: LAItemState[] =
    Array.isArray(row.items) && row.items.length === 10
      ? row.items
      : buildDefaultLAItems();

  const rawSigs = Array.isArray(row.signatures) ? row.signatures : [{}, {}];
  const signatures: [LASignatory, LASignatory] = [
    normSig(rawSigs[0]),
    normSig(rawSigs[1] ?? {}),
  ];

  return {
    id:                   row.id,
    projectId:            row.project_id,
    templateId:           row.template_id,
    userId:               row.user_id,
    status:               row.status as LiftingAccessoriesInspection['status'],
    company:              row.company ?? '',
    address:              row.address ?? '',
    inspectorName:        row.inspector_name ?? '',
    inspectionDate:       row.inspection_date,
    equipmentTypes:       Array.isArray(row.equipment_types) ? row.equipment_types : [],
    equipmentTypeOther:   row.equipment_type_other ?? '',
    serialNumber:         row.serial_number ?? '',
    manufacturer:         row.manufacturer ?? '',
    yearOfManufacture:    row.year_of_manufacture ?? '',
    markingStatus:        row.marking_status,
    wllKg:                row.wll_kg ?? '',
    unitCount:            row.unit_count ?? '',
    nextInspectionDate:   row.next_inspection_date,
    items,
    removedRows:          Array.isArray(row.removed_rows) ? row.removed_rows : [],
    verdict:              (row.verdict as LiftingAccessoriesInspection['verdict']) ?? null,
    verdictComment:       row.verdict_comment ?? '',
    signatures,
    summaryPhotos:        Array.isArray(row.summary_photos) ? row.summary_photos : [],
    completedAt:          row.completed_at,
    createdAt:            row.created_at,
    updatedAt:            row.updated_at,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const liftingAccessoriesApi = {
  create: async (args: {
    projectId: string;
    templateId: string;
    inspectorName?: string;
  }): Promise<LiftingAccessoriesInspection> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const defaultSig = (name: string): LASignatory => ({
      name,
      position: '',
      organization: '',
      extra: {},
      signature: null,
      date: null,
    });

    const { data, error } = await supabase
      .from('lifting_accessories_inspections')
      .insert({
        project_id:  args.projectId,
        template_id: args.templateId,
        user_id:     user.id,
        inspection_date: new Date().toISOString().slice(0, 10),
        inspector_name: args.inspectorName ?? null,
        items: buildDefaultLAItems(),
        signatures: [
          defaultSig(args.inspectorName ?? ''),
          defaultSig(''),
        ],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  getById: async (id: string): Promise<LiftingAccessoriesInspection | null> => {
    const { data, error } = await supabase
      .from('lifting_accessories_inspections')
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
      equipmentTypes: string[];
      equipmentTypeOther: string;
      serialNumber: string;
      manufacturer: string;
      yearOfManufacture: string;
      markingStatus: string | null;
      wllKg: string;
      unitCount: string;
      nextInspectionDate: string | null;
      items: LAItemState[];
      removedRows: LARemovedRow[];
      verdict: LiftingAccessoriesInspection['verdict'];
      verdictComment: string;
      signatures: [LASignatory, LASignatory];
      summaryPhotos: string[];
    }>,
  ): Promise<void> => {
    const db: Record<string, unknown> = {};
    if ('company'             in patch) db.company               = patch.company;
    if ('address'             in patch) db.address               = patch.address;
    if ('inspectorName'       in patch) db.inspector_name        = patch.inspectorName;
    if ('inspectionDate'      in patch) db.inspection_date       = patch.inspectionDate;
    if ('equipmentTypes'      in patch) db.equipment_types       = patch.equipmentTypes;
    if ('equipmentTypeOther'  in patch) db.equipment_type_other  = patch.equipmentTypeOther;
    if ('serialNumber'        in patch) db.serial_number         = patch.serialNumber;
    if ('manufacturer'        in patch) db.manufacturer          = patch.manufacturer;
    if ('yearOfManufacture'   in patch) db.year_of_manufacture   = patch.yearOfManufacture;
    if ('markingStatus'       in patch) db.marking_status        = patch.markingStatus;
    if ('wllKg'               in patch) db.wll_kg                = patch.wllKg;
    if ('unitCount'           in patch) db.unit_count            = patch.unitCount;
    if ('nextInspectionDate'  in patch) db.next_inspection_date  = patch.nextInspectionDate;
    if ('items'               in patch) db.items                 = patch.items;
    if ('removedRows'         in patch) db.removed_rows          = patch.removedRows;
    if ('verdict'             in patch) db.verdict               = patch.verdict;
    if ('verdictComment'      in patch) db.verdict_comment       = patch.verdictComment;
    // Signatures are ephemeral (memory-only) — never persist to DB
    if ('summaryPhotos'       in patch) db.summary_photos        = patch.summaryPhotos;

    if (Object.keys(db).length === 0) return;
    const { error } = await supabase
      .from('lifting_accessories_inspections')
      .update(db)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  complete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('lifting_accessories_inspections')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  listByProject: async (projectId: string): Promise<LiftingAccessoriesInspection[]> => {
    const { data, error } = await supabase
      .from('lifting_accessories_inspections')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
  },

  /**
   * Uploads a checklist item photo or summary photo.
   * @param itemId - checklist item id (1–10), 'summary'
   * @returns storage path in the answer-photos bucket
   */
  uploadPhoto: async (
    inspectionId: string,
    itemId: number | 'summary',
    photoUri: string,
  ): Promise<string> => {
    const uuid = Crypto.randomUUID();
    const path = `lifting-accessories/${inspectionId}/${itemId}/${uuid}.jpg`;
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
      .catch((e) => logError(e, 'liftingAccessories.deletePhoto'));
  },
};
