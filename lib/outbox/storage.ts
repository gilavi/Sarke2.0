// AsyncStorage persistence for the outbox (corruption-backup pattern copied
// from lib/offline.tsx readQueue/writeQueueRaw) + a change emitter for the
// useOutbox hook + the enqueue entry points. Deliberately free of imports
// into lib/apiHooks or the per-type inspection services so that
// lib/inspection/service.ts can enqueue without an import cycle.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { logError } from '../logError';
import type { NewOutboxOp, OutboxOp } from './types';

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
    ops.push({
      ...op,
      id: Crypto.randomUUID(),
      attempts: 0,
      enqueuedAt: new Date().toISOString(),
    } as OutboxOp);
    await writeOutboxQueue(ops);
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
