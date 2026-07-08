// AsyncStorage persistence for the outbox (corruption-backup pattern copied
// from lib/offline.tsx readQueue/writeQueueRaw) + a change emitter for the
// useOutbox hook + the enqueue entry points. Deliberately free of imports
// into lib/apiHooks or the per-type inspection services so that
// lib/inspection/service.ts can enqueue without an import cycle.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { onlineManager } from '@tanstack/react-query';
import { logError } from '../logError';
import type { NewOutboxOp, OutboxEntity, OutboxOp, RecordSaveOp } from './types';

const QUEUE_KEY = '@outbox:queue';
const QUEUE_BACKUP_KEY = '@outbox:queue:backup';
const FAILED_KEY = '@outbox:failed';
const FAILED_BACKUP_KEY = '@outbox:failed:backup';

// ── Change emitter (useOutbox subscribes) ────────────────────────────────────

/**
 * Network-classified failure — the only kind a direct write may fall back to
 * the queue on. Validation/RLS errors must surface to the caller unchanged.
 * Lives here (the leaf module) so service files can import it cycle-free.
 */
export function isNetworkError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('offline')
  );
}

const listeners = new Set<() => void>();

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitOutboxChange(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      // a bad listener must not break the others
    }
  }
}

// ── Reads / writes (backup-first, parse-fallback) ────────────────────────────

async function read(key: string, backupKey: string, tag: string): Promise<OutboxOp[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxOp[]) : [];
  } catch (e) {
    const backup = await AsyncStorage.getItem(backupKey);
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        return Array.isArray(parsed) ? (parsed as OutboxOp[]) : [];
      } catch {
        logError(e, `outbox.read.${tag}.backup_corrupted`);
        return [];
      }
    }
    logError(e, `outbox.read.${tag}.parse`);
    return [];
  }
}

async function write(key: string, backupKey: string, ops: OutboxOp[]): Promise<void> {
  const serialized = JSON.stringify(ops);
  await AsyncStorage.setItem(backupKey, serialized);
  await AsyncStorage.setItem(key, serialized);
}

export function readOutboxQueue(): Promise<OutboxOp[]> {
  return read(QUEUE_KEY, QUEUE_BACKUP_KEY, 'queue');
}

export async function writeOutboxQueue(ops: OutboxOp[]): Promise<void> {
  await write(QUEUE_KEY, QUEUE_BACKUP_KEY, ops);
  emitOutboxChange();
}

export function readOutboxFailed(): Promise<OutboxOp[]> {
  return read(FAILED_KEY, FAILED_BACKUP_KEY, 'failed');
}

export async function writeOutboxFailed(ops: OutboxOp[]): Promise<void> {
  await write(FAILED_KEY, FAILED_BACKUP_KEY, ops);
  emitOutboxChange();
}

// ── Mutation lock ─────────────────────────────────────────────────────────────
// Serialize every read→modify→write cycle (enqueue + flush) through one
// promise chain, mirroring OfflineProvider's runExclusive — concurrent cycles
// would race and silently drop ops.

let lock: Promise<unknown> = Promise.resolve();
export function runOutboxExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = lock.then(fn, fn);
  lock = next.catch(() => undefined);
  return next;
}

// ── Enqueue ──────────────────────────────────────────────────────────────────

/**
 * Append an op (id/attempts/enqueuedAt filled in here). For a record_save
 * UPDATE whose CREATE (or an earlier update) of the same record is still
 * queued, the payloads coalesce into the earlier op instead — this is the
 * edit-after-queued-create path, mirroring enqueueQuestionnaireUpdate's merge.
 */
export function enqueueOutboxOp(op: NewOutboxOp): Promise<void> {
  return runOutboxExclusive(async () => {
    const ops = await readOutboxQueue();
    if (op.kind === 'record_save' && op.mode === 'update') {
      for (let i = ops.length - 1; i >= 0; i--) {
        const prev = ops[i];
        if (prev.kind === 'record_save' && prev.recordId === op.recordId) {
          ops[i] = {
            ...prev,
            payload: { ...prev.payload, ...op.payload },
            displayTitle: op.displayTitle || prev.displayTitle,
          };
          await writeOutboxQueue(ops);
          return;
        }
      }
    }
    // Equipment autosave patches coalesce into the newest queued write of the
    // same row — the still-queued creation (edit-after-queued-create) or the
    // previous patch — so a 700ms-debounced offline edit session stays ONE op.
    // A completion (syncParent set) must append instead: the parent-status
    // mirror has to replay AFTER the equipment row exists (group FIFO), and
    // an inspection_create's insertRow can't carry the parent update.
    if (op.kind === 'equipment_patch' && !op.syncParent) {
      for (let i = ops.length - 1; i >= 0; i--) {
        const prev = ops[i];
        if (prev.kind === 'equipment_patch' && prev.inspectionId === op.inspectionId && prev.table === op.table) {
          ops[i] = { ...prev, patch: { ...prev.patch, ...op.patch } };
          await writeOutboxQueue(ops);
          return;
        }
        if (prev.kind === 'inspection_create' && prev.inspectionId === op.inspectionId && prev.table === op.table) {
          ops[i] = { ...prev, insertRow: { ...prev.insertRow, ...op.patch } };
          await writeOutboxQueue(ops);
          return;
        }
      }
    }
    ops.push({
      ...op,
      id: Crypto.randomUUID(),
      attempts: 0,
      enqueuedAt: new Date().toISOString(),
    } as OutboxOp);
    await writeOutboxQueue(ops);
  }).then(() => {
    // An op enqueued while the device still believes it's online got here via
    // a network-classified FAILURE (timeout on flaky wifi, etc.). Without this
    // kick nothing would replay it until the next NetInfo transition or app
    // restart — schedule a flush shortly. Dynamic import: a static import of
    // flush from this leaf module would arm the service→registry→services
    // import cycle at module-init.
    if (onlineManager.isOnline()) {
      setTimeout(() => {
        void import('./flush')
          .then((m) => m.flushOutbox())
          .catch(() => undefined);
      }, 3000);
    }
  });
}

/** True when a record_save for this record is still waiting in the queue. */
export async function hasQueuedRecordSave(recordId: string): Promise<boolean> {
  const ops = await readOutboxQueue();
  return ops.some((o) => o.kind === 'record_save' && o.recordId === recordId);
}

/** Queued record_save CREATE ops for an entity — duplicate-create guards. */
export async function queuedRecordCreates(entity: OutboxEntity): Promise<RecordSaveOp[]> {
  const ops = await readOutboxQueue();
  return ops.filter(
    (o): o is RecordSaveOp =>
      o.kind === 'record_save' && o.entity === entity && o.mode === 'create',
  );
}

/**
 * Move a FAILED group back into the live queue (attempts reset). Used when a
 * new write arrives for a record whose earlier ops failed out — the new op
 * only makes sense after they land, so they get another chance first.
 */
export function reviveFailedGroup(groupId: string): Promise<boolean> {
  return runOutboxExclusive(async () => {
    const failed = await readOutboxFailed();
    const revive = failed.filter((f) => f.groupId === groupId);
    if (revive.length === 0) return false;
    const queue = await readOutboxQueue();
    await writeOutboxQueue([
      ...queue,
      ...revive.map((f) => ({ ...f, attempts: 0, lastError: undefined })),
    ]);
    await writeOutboxFailed(failed.filter((f) => f.groupId !== groupId));
    return true;
  });
}

/**
 * True when a write for this equipment inspection (creation or patch) is
 * still queued — the pending-create guard for makeInspectionService: a direct
 * UPDATE against a row whose creation hasn't replayed yet silently no-ops
 * (no row-count check), losing the edit when the create later lands.
 */
export async function hasQueuedEquipmentWrite(inspectionId: string): Promise<boolean> {
  const ops = await readOutboxQueue();
  return ops.some(
    (o) =>
      (o.kind === 'inspection_create' && o.inspectionId === inspectionId) ||
      (o.kind === 'equipment_patch' && o.inspectionId === inspectionId),
  );
}

/**
 * Drop a queued file_upload for bucket+path (photo deleted before its offline
 * upload ever ran) and clean its staged file. Returns true when one was found
 * — the caller can then skip the storage remove (nothing ever reached the
 * server).
 */
export function removeQueuedFileUpload(bucket: string, path: string): Promise<boolean> {
  return runOutboxExclusive(async () => {
    const ops = await readOutboxQueue();
    const idx = ops.findIndex((o) => o.kind === 'file_upload' && o.bucket === bucket && o.path === path);
    if (idx < 0) return false;
    const [removed] = ops.splice(idx, 1);
    if ('localUri' in removed && removed.localUri) {
      // Dynamic import: keep this leaf module free of static expo-file-system
      // (same reasoning as the flushOutbox kick below).
      void import('expo-file-system/legacy')
        .then((fs) => fs.deleteAsync(removed.localUri, { idempotent: true }))
        .catch(() => undefined);
    }
    await writeOutboxQueue(ops);
    return true;
  });
}

/** Inspection ids whose creation is still queued (offline.tsx defers their answer/patch ops). */
export async function pendingInspectionIds(): Promise<Set<string>> {
  const ops = await readOutboxQueue();
  const ids = new Set<string>();
  for (const op of ops) {
    if (op.kind === 'inspection_create') ids.add(op.inspectionId);
  }
  return ids;
}
