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
import { onlineManager } from '@tanstack/react-query';
import { storageApi } from '../services';
import {
  enqueueOutboxOp,
  isNetworkError,
  hasQueuedEquipmentWrite,
  removeQueuedFileUpload,
  reviveFailedGroup,
} from '../outbox/storage';
import { logError } from '../logError';
import * as Crypto from 'expo-crypto';

/** Georgian pending-sync title shared by every equipment outbox op. */
const EQUIPMENT_DISPLAY_TITLE = 'აღჭურვილობის შემოწმების აქტი';

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

  // Equipment "completed"/"draft" lives on the <type>_inspections row, but every
  // unified inspection feed reads the PARENT public.inspections row (same id):
  // Home/History `inspectionsApi.recent`, the get_project_inspections_unified
  // RPC, and the project-detail list all key off `inspections.status`. Mirror
  // the status onto the parent or completed equipment acts never surface
  // anywhere. See docs/reports/BUG_REPORT.md ("Completed equipment inspections
  // missing from inspection feeds"). The parent's freeze trigger admits both a
  // draft->completed transition and an explicit owner reopen (status draft +
  // completed_at null), so no special-casing is needed here.
  const syncParent = async (id: string, status: 'draft' | 'completed', completedAt: string | null) => {
    const { error } = await supabase
      .from('inspections')
      .update({ status, completed_at: completedAt })
      .eq('id', id);
    if (error) throw new Error(error.message);
  };

  return {
    create: async (args) => {
      const projectId = assertUuid(args.projectId, 'projectId', table);
      const templateId = assertUuid(args.templateId, 'templateId', table);
      // getSession reads the locally cached session — getUser is a network
      // round-trip and would hang the offline create path.
      const user = (await supabase.auth.getSession()).data.session?.user ?? null;
      if (!user) throw new Error('Not signed in');

      // Generate the id app-side so the parent row and the equipment row
      // share the same UUID. The equipment table's PK column has a
      // gen_random_uuid() default but we override it on insert.
      const id = Crypto.randomUUID();
      const rpcArgs = {
        p_type: cfg.inspectionType,
        p_id: id,
        p_project_id: projectId,
        p_user_id: user.id,
        p_template_id: templateId,
      };
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

      // Offline (or a network-failed step): queue the two-step creation for
      // replay — the outbox runs the parent RPC first, then UPSERTS the
      // equipment row (parent-row-first rule preserved; both steps are
      // retry-safe) — and return an optimistic model so the flow proceeds
      // against the client id. Its answers/photos queue behind the creation.
      const enqueue = async () => {
        await enqueueOutboxOp({
          kind: 'inspection_create',
          groupId: id,
          variant: 'equipment',
          inspectionId: id,
          projectId,
          rpcArgs,
          table,
          insertRow: insert,
          displayTitle: EQUIPMENT_DISPLAY_TITLE,
        });
        return cfg.toModel({
          ...insert,
          status: 'draft',
          created_at: new Date().toISOString(),
          completed_at: null,
        });
      };

      if (!onlineManager.isOnline()) return enqueue();
      try {
        // Step 1: parent row in public.inspections via the RPC.
        // Idempotent on the DB side (ON CONFLICT (id) DO NOTHING) so a retry
        // after a transient network error is safe.
        const { error: rpcError } = await supabase.rpc('create_equipment_inspection', rpcArgs);
        if (rpcError) throw new Error(rpcError.message);

        // Step 2: equipment-table row with the same id. The FK added in
        // 20260527001240_unify_inspection_identity.sql enforces that the
        // parent row exists.
        const { data, error } = await supabase.from(table).insert(insert).select().single();
        if (error) throw new Error(error.message);
        return cfg.toModel(data);
      } catch (e) {
        if (isNetworkError(e)) return enqueue();
        throw e;
      }
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
      // Offline (or a network-failed write): queue the patch. Enqueue-side
      // coalescing folds it into the row's still-queued creation or previous
      // patch, so a whole offline autosave session stays one op.
      const enqueue = () =>
        enqueueOutboxOp({
          kind: 'equipment_patch',
          groupId: id,
          inspectionId: id,
          table,
          patch: db,
          syncParent: null,
          displayTitle: EQUIPMENT_DISPLAY_TITLE,
        });
      if (!onlineManager.isOnline()) return enqueue();
      // Pending-write guard: while this row's creation (or an earlier patch)
      // is still queued — or died into the failed queue (revived first) — a
      // direct UPDATE hits a row that doesn't exist yet and silently no-ops,
      // losing the edit when the queued create later replays.
      if ((await reviveFailedGroup(id)) || (await hasQueuedEquipmentWrite(id))) return enqueue();
      try {
        const { error } = await supabase.from(table).update(db).eq('id', id);
        if (error) throw new Error(error.message);
      } catch (e) {
        if (isNetworkError(e)) return enqueue();
        throw e;
      }
    },

    reopen: async (id) => {
      const { error } = await supabase
        .from(table)
        .update({ status: 'draft', completed_at: null })
        .eq('id', id);
      if (error) throw new Error(error.message);
      await syncParent(id, 'draft', null);
    },

    complete: async (id) => {
      const completedAt = new Date().toISOString();
      // Offline completion queues BOTH halves of the dual-write (equipment
      // row + parent public.inspections mirror) as one op; it never coalesces
      // into a queued create, so the parent mirror replays after the row
      // exists (group FIFO).
      const enqueue = () =>
        enqueueOutboxOp({
          kind: 'equipment_patch',
          groupId: id,
          inspectionId: id,
          table,
          patch: { status: 'completed', completed_at: completedAt },
          syncParent: { status: 'completed', completedAt },
          displayTitle: EQUIPMENT_DISPLAY_TITLE,
        });
      if (!onlineManager.isOnline()) return enqueue();
      if ((await reviveFailedGroup(id)) || (await hasQueuedEquipmentWrite(id))) return enqueue();
      try {
        const { error } = await supabase
          .from(table)
          .update({ status: 'completed', completed_at: completedAt })
          .eq('id', id);
        if (error) throw new Error(error.message);
        await syncParent(id, 'completed', completedAt);
      } catch (e) {
        // Both updates are idempotent, so replaying the whole pair after a
        // half-applied pass (row updated, parent mirror network-failed) is safe.
        if (isNetworkError(e)) return enqueue();
        throw e;
      }
    },

    uploadPhotoAt: async (subpath, photoUri) => {
      const uuid = Crypto.randomUUID();
      const path = `${pathPrefix}/${subpath}/${uuid}.jpg`;
      // Offline (or a network-failed upload): compress + stage the photo on
      // disk, queue a file_upload op, and resolve with the final storage path
      // — the caller stores the path in photo_paths exactly like an online
      // upload (paths are pre-computed, so the row may land before its
      // objects; see lib/outbox/AGENTS.md). Every service prefixes `subpath`
      // with the inspection id, which is the op's group.
      const stage = async () => {
        const inspectionId = subpath.split('/')[0];
        // Dynamic imports on purpose (mirrors the flush kick in
        // lib/outbox/storage.ts): the compression/cache modules pull in
        // expo-image-manipulator / expo-file-system, which must not load at
        // module-init for every service.ts consumer.
        const { stageCompressedPhotoForOffline } = await import('../photoCompression');
        const localUri = await stageCompressedPhotoForOffline(photoUri, 'inspection');
        await enqueueOutboxOp({
          kind: 'file_upload',
          groupId: inspectionId,
          bucket: STORAGE_BUCKETS.answerPhotos,
          path,
          localUri,
          contentType: 'image/jpeg',
          displayTitle: EQUIPMENT_DISPLAY_TITLE,
        });
        // Let imageForDisplay render the staged photo before it uploads.
        void import('../imageOfflineCache')
          .then((m) => m.seedDisplayCacheFromLocalFile(STORAGE_BUCKETS.answerPhotos, path, localUri))
          .catch(() => undefined);
        return path;
      };
      if (!onlineManager.isOnline()) return stage();
      try {
        await storageApi.uploadFromUri(STORAGE_BUCKETS.answerPhotos, path, photoUri, 'image/jpeg', 'inspection');
        return path;
      } catch (e) {
        if (isNetworkError(e)) return stage();
        throw e;
      }
    },

    deletePhoto: async (path) => {
      // A photo whose offline upload is still queued never reached the
      // server: dropping the op (and its staged file) is the whole delete.
      const removed = await removeQueuedFileUpload(STORAGE_BUCKETS.answerPhotos, path);
      if (removed) return;
      await storageApi.remove(STORAGE_BUCKETS.answerPhotos, path).catch((e) => logError(e, `${pathPrefix}.deletePhoto`));
    },
  };
}
