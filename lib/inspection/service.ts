/**
 * Inspection service factory.
 *
 * Every equipment type had a near-identical lib/<type>Service.ts: a snake→camel
 * `toModel`, a per-field `if ('x' in patch) db.y = patch.x` block, and the same
 * create/getById/patch/complete/listByProject/deletePhoto bodies. This factory
 * holds those once; each type supplies only the genuinely per-type parts
 * (toModel, toDb, the create-time default columns) plus thin photo-upload
 * wrappers for its path layout.
 *
 * Persistence is intentionally isolated behind this factory: collapsing the 9
 * per-type tables into one (or onto the generic inspections table) later is a
 * change to the configs, not to any screen.
 */
import { supabase, STORAGE_BUCKETS } from '../supabase';
import { storageApi } from '../services';
import { logError } from '../logError';
import * as Crypto from 'expo-crypto';

// Validates a UUID-shaped string. Surfaces a clear typed error before Supabase
// produces a vague FK violation when a caller passes an empty/array/wrong-shape
// projectId or templateId.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(value: unknown, field: string, table: string): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new Error(`${table}.create: ${field} must be a UUID (got ${JSON.stringify(value)})`);
  }
  return value;
}

export interface CreateArgs {
  projectId: string;
  templateId: string;
  inspectorName?: string;
}

export interface InspectionServiceConfig<T, P extends object> {
  table: string;
  /** Storage path prefix under the answer-photos bucket (e.g. 'excavator'). */
  pathPrefix: string;
  /**
   * `inspections.type` tag used when creating the parent row via the
   * create_equipment_inspection RPC. Matches the value the migration's
   * Step 2 backfill assigned (e.g. 'bobcat', 'safety_net_inspection').
   */
  inspectionType: string;
  /** DB row → domain model (snake → camel, with any length-guard fallbacks). */
  toModel: (row: any) => T;
  /** Domain patch → DB columns (camel → snake; only present keys). */
  toDb: (patch: P) => Record<string, unknown>;
  /**
   * Type-specific columns inserted on create (item arrays, spec snapshots, and
   * inspector_name where the table has it - fall-protection, e.g., does not).
   */
  createColumns: (args: CreateArgs) => Record<string, unknown>;
  /** Whether create stamps inspection_date = today (default true). */
  setsInspectionDate?: boolean;
}

export interface InspectionService<T, P extends object> {
  create: (args: CreateArgs) => Promise<T>;
  getById: (id: string) => Promise<T | null>;
  listByProject: (projectId: string) => Promise<T[]>;
  patch: (id: string, patch: P) => Promise<void>;
  complete: (id: string) => Promise<void>;
  /**
   * Reopen a completed inspection back to draft so the wizard can edit it.
   * Clears completed_at. Equipment tables carry their own status column and are
   * not guarded by a freeze trigger, so this is a plain UPDATE. The document
   * re-completes through the normal flow. See lib/documents/reopen.ts.
   */
  reopen: (id: string) => Promise<void>;
  /** Upload a photo at `<pathPrefix>/<subpath>/<uuid>.jpg`; returns the path. */
  uploadPhotoAt: (subpath: string, photoUri: string) => Promise<string>;
  deletePhoto: (path: string) => Promise<void>;
}

export function makeInspectionService<T, P extends object = Record<string, unknown>>(
  cfg: InspectionServiceConfig<T, P>,
): InspectionService<T, P> {
  const { table, pathPrefix } = cfg;

  return {
    create: async (args) => {
      const projectId = assertUuid(args.projectId, 'projectId', table);
      const templateId = assertUuid(args.templateId, 'templateId', table);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // Generate the id app-side so the parent row and the equipment row
      // share the same UUID. The equipment table's PK column has a
      // gen_random_uuid() default but we override it on insert.
      const id = Crypto.randomUUID();

      // Step 1: parent row in public.inspections via the RPC.
      // Idempotent on the DB side (ON CONFLICT (id) DO NOTHING) so a retry
      // after a transient network error is safe.
      const { error: rpcError } = await supabase.rpc('create_equipment_inspection', {
        p_type: cfg.inspectionType,
        p_id: id,
        p_project_id: projectId,
        p_user_id: user.id,
        p_template_id: templateId,
      });
      if (rpcError) throw new Error(rpcError.message);

      // Step 2: equipment-table row with the same id. The FK added in
      // 20260527001240_unify_inspection_identity.sql enforces that the
      // parent row exists.
      const insert: Record<string, unknown> = {
        id,
        project_id: projectId,
        template_id: templateId,
        user_id: user.id,
        ...cfg.createColumns(args),
      };
      if (cfg.setsInspectionDate !== false) {
        insert.inspection_date = new Date().toISOString().slice(0, 10);
      }

      const { data, error } = await supabase.from(table).insert(insert).select().single();
      if (error) throw new Error(error.message);
      return cfg.toModel(data);
    },

    getById: async (id) => {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? cfg.toModel(data) : null;
    },

    listByProject: async (projectId) => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as any[]).map(cfg.toModel);
    },

    patch: async (id, patch) => {
      const db = cfg.toDb(patch);
      if (Object.keys(db).length === 0) return;
      const { error } = await supabase.from(table).update(db).eq('id', id);
      if (error) throw new Error(error.message);
    },

    reopen: async (id) => {
      const { error } = await supabase
        .from(table)
        .update({ status: 'draft', completed_at: null })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },

    complete: async (id) => {
      const { error } = await supabase
        .from(table)
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },

    uploadPhotoAt: async (subpath, photoUri) => {
      const uuid = Crypto.randomUUID();
      const path = `${pathPrefix}/${subpath}/${uuid}.jpg`;
      await storageApi.uploadFromUri(STORAGE_BUCKETS.answerPhotos, path, photoUri, 'image/jpeg', 'inspection');
      return path;
    },

    deletePhoto: async (path) => {
      await storageApi.remove(STORAGE_BUCKETS.answerPhotos, path).catch((e) => logError(e, `${pathPrefix}.deletePhoto`));
    },
  };
}
