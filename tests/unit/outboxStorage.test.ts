/**
 * Unit tests for the outbox queue storage (lib/outbox/storage.ts): enqueue,
 * the update-into-queued-create coalescing (edit-after-queued-create), the
 * corruption-backup fallback, and pendingInspectionIds.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
  },
}));

vi.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `op-${++n}` };
});

vi.mock('../../lib/logError', () => ({ logError: vi.fn() }));

import {
  enqueueOutboxOp,
  readOutboxQueue,
  readOutboxFailed,
  writeOutboxFailed,
  reviveFailedGroup,
  pendingInspectionIds,
} from '../../lib/outbox/storage';
import type { NewOutboxOp, OutboxOp, RecordSaveOp } from '../../lib/outbox/types';

type NewRecordSaveOp = Extract<NewOutboxOp, { kind: 'record_save' }>;

const createOp = (recordId: string, payload: Record<string, unknown>): NewRecordSaveOp => ({
  kind: 'record_save',
  groupId: recordId,
  entity: 'briefing',
  mode: 'create',
  recordId,
  payload,
  displayTitle: 'ინსტრუქტაჟი',
  projectId: 'p1',
});

const updateOp = (recordId: string, payload: Record<string, unknown>): NewRecordSaveOp => ({
  ...createOp(recordId, payload),
  mode: 'update',
});

beforeEach(() => {
  store.clear();
});

describe('enqueueOutboxOp', () => {
  it('appends ops with generated id / attempts 0', async () => {
    await enqueueOutboxOp(createOp('b1', { id: 'b1', topics: ['a'] }));
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    expect(ops[0].attempts).toBe(0);
    expect(ops[0].id).toMatch(/^op-/);
  });

  it('coalesces an update into a still-queued create of the same record', async () => {
    await enqueueOutboxOp(createOp('b1', { id: 'b1', topics: ['a'], status: 'draft' }));
    await enqueueOutboxOp(updateOp('b1', { participants: [{ name: 'x' }], status: 'completed' }));
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    const op = ops[0] as RecordSaveOp;
    expect(op.mode).toBe('create');
    expect(op.payload).toEqual({
      id: 'b1',
      topics: ['a'],
      status: 'completed',
      participants: [{ name: 'x' }],
    });
  });

  it('coalesces successive updates of the same record', async () => {
    await enqueueOutboxOp(updateOp('b1', { topics: ['a'] }));
    await enqueueOutboxOp(updateOp('b1', { status: 'completed' }));
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    expect((ops[0] as RecordSaveOp).payload).toEqual({ topics: ['a'], status: 'completed' });
  });

  it('does NOT coalesce across different records or non-record ops', async () => {
    await enqueueOutboxOp(createOp('b1', { id: 'b1' }));
    await enqueueOutboxOp(updateOp('b2', { status: 'completed' }));
    await enqueueOutboxOp({
      kind: 'file_upload',
      groupId: 'b1',
      bucket: 'incident-photos',
      path: 'b1/x.jpg',
      localUri: 'file:///staged/x.jpg',
      contentType: 'image/jpeg',
      displayTitle: '',
    });
    expect(await readOutboxQueue()).toHaveLength(3);
  });
});

describe('pendingInspectionIds', () => {
  it('returns the ids of queued inspection creations only', async () => {
    await enqueueOutboxOp({
      kind: 'inspection_create',
      groupId: 'i1',
      variant: 'equipment',
      inspectionId: 'i1',
      projectId: 'p1',
      rpcArgs: { p_id: 'i1' },
      table: 'bobcat_inspections',
      insertRow: { id: 'i1' },
      displayTitle: '',
    });
    await enqueueOutboxOp(createOp('b1', { id: 'b1' }));
    const ids = await pendingInspectionIds();
    expect(ids.has('i1')).toBe(true);
    expect(ids.size).toBe(1);
  });
});

describe('reviveFailedGroup', () => {
  const failedOp = (recordId: string, over: Partial<OutboxOp> = {}): OutboxOp =>
    ({
      ...createOp(recordId, { id: recordId }),
      id: `failed-${recordId}`,
      attempts: 0,
      enqueuedAt: '2026-07-02T00:00:00Z',
      ...over,
    }) as OutboxOp;

  it('revives only the requested group, resetting attempts and clearing lastError', async () => {
    await writeOutboxFailed([
      failedOp('b1', { lastError: 'boom b1' }),
      failedOp('b2', { lastError: 'boom b2' }),
    ]);
    expect(await reviveFailedGroup('b1')).toBe(true);
    const queue = await readOutboxQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].groupId).toBe('b1');
    expect(queue[0].attempts).toBe(0);
    expect(queue[0].lastError).toBeUndefined();
    const failed = await readOutboxFailed();
    expect(failed).toHaveLength(1);
    expect(failed[0].groupId).toBe('b2');
    expect(failed[0].lastError).toBe('boom b2');
  });

  it('returns false when the group has no failed ops', async () => {
    expect(await reviveFailedGroup('missing')).toBe(false);
    expect(await readOutboxQueue()).toHaveLength(0);
  });
});

describe('corruption backup', () => {
  it('falls back to the backup copy when the primary is corrupted', async () => {
    await enqueueOutboxOp(createOp('b1', { id: 'b1' }));
    store.set('@outbox:queue', '{corrupted');
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    expect((ops[0] as RecordSaveOp).recordId).toBe('b1');
  });
});
