// Outbox flush: FIFO with per-group ordering. A failing op skips the REST of
// its group for this pass (other groups keep flushing); an op that exhausts
// its 3 attempts drags its whole group to the failed queue (orphaned children
// could never succeed). An auth-classified error aborts the whole flush
// WITHOUT counting an attempt — the token simply hasn't refreshed yet, and
// burning retries on it would drop real work.

import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../supabase';
import { storageApi } from '../services';
import { queryClient } from '../queryClient';
import { invalidateRecordLists } from '../apiHooks';
import { logError } from '../logError';
import { outboxRegistry } from './registry';
import {
  readOutboxQueue,
  writeOutboxQueue,
  readOutboxFailed,
  writeOutboxFailed,
  runOutboxExclusive,
} from './storage';
import type { OutboxOp } from './types';

const MAX_OP_ATTEMPTS = 3;

function messageOf(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).toLowerCase();
}

/** Postgres 23505 / duplicate key — a replayed create that already landed. */
function isDuplicateKey(e: unknown): boolean {
  const msg = messageOf(e);
  return msg.includes('23505') || msg.includes('duplicate key');
}

/** JWT/refresh problems: abort the flush, retry on next reconnect. */
function isAuthError(e: unknown): boolean {
  const msg = messageOf(e);
  return (
    msg.includes('jwt') ||
    msg.includes('refresh token') ||
    msg.includes('not signed in') ||
    msg.includes('401') ||
    msg.includes('unauthorized')
  );
}

async function executeOp(op: OutboxOp): Promise<void> {
  switch (op.kind) {
    case 'record_save': {
      const writer = outboxRegistry[op.entity];
      try {
        if (op.mode === 'create') await writer.create(op.payload);
        else await writer.update(op.recordId, op.payload);
      } catch (e) {
        // A retried create after a half-applied pass: the row exists — done.
        if (op.mode === 'create' && isDuplicateKey(e)) return;
        throw e;
      }
      return;
    }
    case 'file_upload': {
      await storageApi.uploadFromUri(op.bucket, op.path, op.localUri, op.contentType);
      FileSystem.deleteAsync(op.localUri, { idempotent: true }).catch(() => undefined);
      return;
    }
    case 'pdf_upload': {
      await storageApi.uploadFromUri(op.bucket, op.path, op.localUri, 'application/pdf');
      if (op.dbPatch) {
        await outboxRegistry[op.dbPatch.entity].update(op.dbPatch.recordId, op.dbPatch.patch);
      }
      FileSystem.deleteAsync(op.localUri, { idempotent: true }).catch(() => undefined);
      return;
    }
    case 'inspection_create': {
      // Parent public.inspections row FIRST (CLAUDE.md rule). The RPC is
      // ON CONFLICT (id) DO NOTHING and the row upsert ignores duplicates,
      // so a retry after a half-applied pass is safe.
      if (op.variant === 'equipment' && op.rpcArgs) {
        const { error } = await supabase.rpc('create_equipment_inspection', op.rpcArgs);
        if (error) throw new Error(error.message);
      }
      const { error } = await supabase
        .from(op.table)
        .upsert(op.insertRow, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw new Error(error.message);
      return;
    }
  }
}

let flushing = false;

/** Replay the queue. Single-flight; safe to call from every reconnect path. */
export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    await runOutboxExclusive(async () => {
      const ops = await readOutboxQueue();
      if (ops.length === 0) return;
      const skipGroups = new Set<string>();
      const failGroups = new Set<string>();
      const still: OutboxOp[] = [];
      const newlyFailed: OutboxOp[] = [];
      let anySuccess = false;
      let authAbort = false;

      for (const op of ops) {
        if (authAbort || skipGroups.has(op.groupId)) {
          still.push(op);
          continue;
        }
        if (failGroups.has(op.groupId)) {
          newlyFailed.push({ ...op, attempts: 0 });
          continue;
        }
        try {
          await executeOp(op);
          anySuccess = true;
        } catch (e) {
          if (isAuthError(e)) {
            authAbort = true;
            still.push(op);
            continue;
          }
          const attempts = op.attempts + 1;
          if (attempts >= MAX_OP_ATTEMPTS) {
            logError(e, `outbox.flush.fail.${op.kind}`);
            newlyFailed.push({ ...op, attempts: 0 });
            failGroups.add(op.groupId);
          } else {
            still.push({ ...op, attempts });
            skipGroups.add(op.groupId);
          }
        }
      }

      await writeOutboxQueue(still);
      if (newlyFailed.length > 0) {
        const failed = await readOutboxFailed();
        await writeOutboxFailed([...failed, ...newlyFailed]);
      }
      // Real rows just landed — let the lists pick them up (this is also how
      // pending-section items get replaced by their records).
      if (anySuccess) void invalidateRecordLists(queryClient);
    });
  } finally {
    flushing = false;
  }
}

/** Move every failed group back into the queue (attempts reset) and flush. */
export async function retryOutboxFailed(): Promise<void> {
  await runOutboxExclusive(async () => {
    const failed = await readOutboxFailed();
    if (failed.length === 0) return;
    const queue = await readOutboxQueue();
    await writeOutboxQueue([...queue, ...failed.map((f) => ({ ...f, attempts: 0 }))]);
    await writeOutboxFailed([]);
  });
  await flushOutbox();
}

/** Drop failed ops (one group, or all) and clean their staged files. */
export function dismissOutboxFailed(groupId?: string): Promise<void> {
  return runOutboxExclusive(async () => {
    const failed = await readOutboxFailed();
    const drop = groupId ? failed.filter((f) => f.groupId === groupId) : failed;
    const keep = groupId ? failed.filter((f) => f.groupId !== groupId) : [];
    for (const op of drop) {
      if ('localUri' in op && op.localUri) {
        FileSystem.deleteAsync(op.localUri, { idempotent: true }).catch(() => undefined);
      }
    }
    await writeOutboxFailed(keep);
  });
}
