// The flow-facing write primitive: record writes from document flows go
// through here, never raw `*.create()` / `*.update()` in a screen. Online it
// is exactly the direct call it replaces (inline validation errors still
// surface); offline — or on a network-classified failure — it queues the op
// and seeds the detail cache so the flow (and cachedRead) can keep going.

import { onlineManager } from '@tanstack/react-query';
import { queryClient } from '../queryClient';
import { outboxRegistry } from './registry';
import {
  enqueueOutboxOp,
  hasQueuedRecordSave,
  isNetworkError,
  reviveFailedGroup,
} from './storage';
import type { OutboxEntity } from './types';

export interface SaveRecordArgs {
  entity: OutboxEntity;
  mode: 'create' | 'update';
  /** Client-generated record id (create) / existing id (update). */
  recordId: string;
  /** Exact service-call args (create) or patch (update). JSON-safe. */
  payload: Record<string, unknown>;
  /** Georgian title for the pending-sync list. */
  displayTitle: string;
  projectId?: string | null;
  /** `qk.<entity>.byId(recordId)` — seeds the detail cache for queued saves. */
  detailKey?: readonly unknown[];
  /** Optimistic model matching the entity's getById shape. */
  optimistic?: unknown;
}

export interface SaveRecordResult {
  queued: boolean;
  /** The service's return value when the save ran directly (online). */
  record?: unknown;
}

export async function saveRecordThroughOutbox(args: SaveRecordArgs): Promise<SaveRecordResult> {
  const enqueue = async (): Promise<SaveRecordResult> => {
    await enqueueOutboxOp({
      kind: 'record_save',
      groupId: args.recordId,
      entity: args.entity,
      mode: args.mode,
      recordId: args.recordId,
      payload: args.payload,
      displayTitle: args.displayTitle,
      projectId: args.projectId ?? null,
    });
    if (args.detailKey && args.optimistic !== undefined) {
      queryClient.setQueryData(args.detailKey, args.optimistic);
    }
    return { queued: true };
  };

  if (!onlineManager.isOnline()) return enqueue();
  if (args.mode === 'update') {
    // If this record's CREATE (or an earlier save) is still queued — or died
    // into the failed queue — the server row may not exist yet: a direct
    // update would 404, or for the services without a .single() row check it
    // would silently no-op and the edit would be LOST when the queued create
    // later replays. Coalesce into the pending op instead; the enqueue kick
    // flushes it right after.
    const revived = await reviveFailedGroup(args.recordId);
    if (revived || (await hasQueuedRecordSave(args.recordId))) return enqueue();
  }
  try {
    const record =
      args.mode === 'create'
        ? await outboxRegistry[args.entity].create(args.payload)
        : await outboxRegistry[args.entity].update(args.recordId, args.payload);
    return { queued: false, record };
  } catch (e) {
    // Only network-classified failures queue; validation/RLS errors must
    // surface to the caller exactly as before.
    if (isNetworkError(e)) return enqueue();
    throw e;
  }
}
