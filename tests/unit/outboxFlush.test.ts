/**
 * Unit tests for the outbox flush (lib/outbox/flush.ts): FIFO with per-group
 * skip-on-failure, attempts accounting, whole-group failure cascade, the
 * auth-abort rule (no attempt burned), duplicate-key-as-success on replayed
 * creates, and the parent-RPC-before-equipment-upsert ordering.
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
vi.mock('expo-file-system/legacy', () => ({
  deleteAsync: vi.fn(async () => undefined),
}));
vi.mock('../../lib/logError', () => ({
  logError: vi.fn(),
  toErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

const calls: string[] = [];
const rpcMock = vi.fn(async (_fn: string, _args: unknown) => {
  calls.push('rpc');
  return { error: null };
});
const upsertMock = vi.fn(async (_row: unknown, _opts: unknown) => {
  calls.push('upsert');
  return { error: null };
});
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (fn: string, args: unknown) => rpcMock(fn, args),
    from: () => ({ upsert: (row: unknown, opts: unknown) => upsertMock(row, opts) }),
  },
}));

const uploadFromUri = vi.fn(async (..._a: unknown[]) => undefined);
vi.mock('../../lib/services', () => ({
  storageApi: {
    uploadFromUri: (...a: unknown[]) => uploadFromUri(...a),
  },
  incidentsApi: { create: vi.fn(async () => ({})), update: vi.fn(async () => ({})) },
  reportsApi: { create: vi.fn(async () => ({})), update: vi.fn(async () => ({})) },
}));

const orderCreate = vi.fn(async (_p: unknown) => ({ id: 'o1' }));
const orderUpdate = vi.fn(async (_id: unknown, _p: unknown) => ({ id: 'o1' }));
vi.mock('../../lib/ordersApi', () => ({
  ordersApi: {
    create: (p: unknown) => orderCreate(p),
    update: (id: unknown, p: unknown) => orderUpdate(id, p),
  },
}));
vi.mock('../../lib/briefingsApi', () => ({
  briefingsApi: { create: vi.fn(async () => ({})), update: vi.fn(async () => ({})) },
}));
vi.mock('../../lib/riskAssessmentService', () => ({
  riskAssessmentApi: { create: vi.fn(async () => ({})), patch: vi.fn(async () => undefined) },
}));
vi.mock('../../lib/breathalyzerLogService', () => ({
  breathalyzerLogApi: {
    create: vi.fn(async () => ({})),
    patchEntries: vi.fn(async () => undefined),
    patchDeviceSerial: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  },
}));
vi.mock('../../lib/queryClient', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { queryClient: new QueryClient() };
});
const invalidateMock = vi.fn(async (..._a: unknown[]) => undefined);
vi.mock('../../lib/apiHooks', () => ({
  invalidateRecordLists: (...a: unknown[]) => invalidateMock(...a),
}));

import { onlineManager } from '@tanstack/react-query';
import { readOutboxQueue, readOutboxFailed, writeOutboxQueue, writeOutboxFailed } from '../../lib/outbox/storage';
import { flushOutbox, retryOutboxFailed } from '../../lib/outbox/flush';
import { saveRecordThroughOutbox } from '../../lib/outbox/saveRecord';
import type { OutboxOp } from '../../lib/outbox/types';

let opN = 0;
const op = (over: Partial<OutboxOp>): OutboxOp =>
  ({
    kind: 'record_save',
    id: `id-${++opN}`,
    groupId: 'g1',
    entity: 'order',
    mode: 'create',
    recordId: 'g1',
    payload: { id: 'g1' },
    displayTitle: '',
    projectId: null,
    attempts: 0,
    enqueuedAt: '2026-07-02T00:00:00Z',
    ...over,
  }) as OutboxOp;

beforeEach(() => {
  store.clear();
  calls.length = 0;
  orderCreate.mockReset().mockResolvedValue({ id: 'o1' });
  orderUpdate.mockReset().mockResolvedValue({ id: 'o1' });
  rpcMock.mockClear();
  upsertMock.mockClear();
  invalidateMock.mockClear();
});

describe('flushOutbox', () => {
  it('executes ops FIFO and clears the queue on success', async () => {
    await writeOutboxQueue([op({}), op({ groupId: 'g2', recordId: 'g2', mode: 'update' })]);
    await flushOutbox();
    expect(orderCreate).toHaveBeenCalledWith({ id: 'g1' });
    expect(orderUpdate).toHaveBeenCalledWith('g2', { id: 'g1' });
    expect(await readOutboxQueue()).toHaveLength(0);
    expect(invalidateMock).toHaveBeenCalled();
  });

  it('a failing op skips the rest of its group but other groups still flush', async () => {
    orderCreate.mockRejectedValueOnce(new Error('boom'));
    await writeOutboxQueue([
      op({}), // g1 create — fails
      op({ groupId: 'g1', recordId: 'g1', mode: 'update' }), // g1 update — must be skipped
      op({ groupId: 'g2', recordId: 'g2' }), // g2 create — must run
    ]);
    await flushOutbox();
    const remaining = await readOutboxQueue();
    expect(remaining).toHaveLength(2);
    expect(remaining.every((o) => o.groupId === 'g1')).toBe(true);
    // failed op burned one attempt, the skipped one didn't
    expect(remaining[0].attempts).toBe(1);
    expect(remaining[1].attempts).toBe(0);
    // g2 executed exactly once (g1 create failed, g1 update skipped)
    expect(orderCreate).toHaveBeenCalledTimes(2);
  });

  it('moves the whole group to the failed queue when an op exhausts its attempts', async () => {
    orderCreate.mockRejectedValue(new Error('bad payload'));
    await writeOutboxQueue([
      op({ attempts: 2 }), // third failure → out
      op({ groupId: 'g1', recordId: 'g1', mode: 'update' }), // orphaned child → out too
    ]);
    await flushOutbox();
    expect(await readOutboxQueue()).toHaveLength(0);
    const failed = await readOutboxFailed();
    expect(failed).toHaveLength(2);
    expect(failed.every((o) => o.groupId === 'g1')).toBe(true);
    // The failing op keeps WHY it failed for the pending-sync UI; the
    // orphaned child never ran, so it carries no error of its own.
    expect(failed[0].lastError).toBe('bad payload');
    expect(failed[1].lastError).toBeUndefined();
  });

  it('aborts on an auth error WITHOUT burning attempts', async () => {
    orderCreate.mockRejectedValueOnce(new Error('JWT expired'));
    await writeOutboxQueue([op({}), op({ groupId: 'g2', recordId: 'g2' })]);
    await flushOutbox();
    const remaining = await readOutboxQueue();
    expect(remaining).toHaveLength(2);
    expect(remaining[0].attempts).toBe(0);
    expect(remaining[1].attempts).toBe(0);
    // g2 never attempted — the whole flush aborted
    expect(orderCreate).toHaveBeenCalledTimes(1);
  });

  it('applies a replayed duplicate-key create as an UPDATE so coalesced edits survive', async () => {
    orderCreate.mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint "orders_pkey" (23505)'),
    );
    await writeOutboxQueue([op({})]);
    await flushOutbox();
    // The row already landed on a half-applied pass — the payload (which may
    // carry edits coalesced in since) is re-applied as an update.
    expect(orderUpdate).toHaveBeenCalledWith('g1', { id: 'g1' });
    expect(await readOutboxQueue()).toHaveLength(0);
    expect(await readOutboxFailed()).toHaveLength(0);
  });

  it('replays an equipment inspection creation parent-RPC-first, then upserts the row', async () => {
    await writeOutboxQueue([
      op({
        kind: 'inspection_create',
        variant: 'equipment',
        inspectionId: 'i1',
        projectId: 'p1',
        rpcArgs: { p_type: 'bobcat', p_id: 'i1' },
        table: 'bobcat_inspections',
        insertRow: { id: 'i1' },
      } as Partial<OutboxOp>),
    ]);
    await flushOutbox();
    expect(calls).toEqual(['rpc', 'upsert']);
    expect(rpcMock).toHaveBeenCalledWith('create_equipment_inspection', {
      p_type: 'bobcat',
      p_id: 'i1',
    });
    expect(upsertMock).toHaveBeenCalledWith({ id: 'i1' }, { onConflict: 'id', ignoreDuplicates: true });
  });

  it('uploads staged pdfs and applies their db patch', async () => {
    await writeOutboxQueue([
      op({
        kind: 'pdf_upload',
        bucket: 'pdfs',
        path: 'orders/x.pdf',
        localUri: 'file:///staged/x.pdf',
        dbPatch: { entity: 'order', recordId: 'g1', patch: { pdfUrl: 'orders/x.pdf' } },
      } as Partial<OutboxOp>),
    ]);
    await flushOutbox();
    expect(uploadFromUri).toHaveBeenCalledWith('pdfs', 'orders/x.pdf', 'file:///staged/x.pdf', 'application/pdf');
    expect(orderUpdate).toHaveBeenCalledWith('g1', { pdfUrl: 'orders/x.pdf' });
    expect(await readOutboxQueue()).toHaveLength(0);
  });
});

describe('saveRecordThroughOutbox — online pending-create guards', () => {
  it('coalesces an online UPDATE into a still-queued CREATE instead of writing a nonexistent row', async () => {
    onlineManager.setOnline(true);
    await writeOutboxQueue([op({})]); // queued create for g1, payload { id: 'g1' }
    const res = await saveRecordThroughOutbox({
      entity: 'order',
      mode: 'update',
      recordId: 'g1',
      payload: { status: 'completed' },
      displayTitle: '',
      projectId: null,
    });
    expect(res.queued).toBe(true);
    expect(orderUpdate).not.toHaveBeenCalled();
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    expect((ops[0] as { payload: unknown }).payload).toEqual({ id: 'g1', status: 'completed' });
  });

  it('revives a FAILED group and coalesces the new update behind it', async () => {
    onlineManager.setOnline(true);
    await writeOutboxFailed([op({})]);
    const res = await saveRecordThroughOutbox({
      entity: 'order',
      mode: 'update',
      recordId: 'g1',
      payload: { status: 'completed' },
      displayTitle: '',
      projectId: null,
    });
    expect(res.queued).toBe(true);
    expect(await readOutboxFailed()).toHaveLength(0);
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    expect((ops[0] as { payload: Record<string, unknown> }).payload.status).toBe('completed');
  });

  it('writes directly when nothing is pending for the record', async () => {
    onlineManager.setOnline(true);
    const res = await saveRecordThroughOutbox({
      entity: 'order',
      mode: 'update',
      recordId: 'g9',
      payload: { status: 'completed' },
      displayTitle: '',
      projectId: null,
    });
    expect(res.queued).toBe(false);
    expect(orderUpdate).toHaveBeenCalledWith('g9', { status: 'completed' });
  });
});

describe('retryOutboxFailed', () => {
  it('moves failed ops back to the queue with attempts reset and flushes them', async () => {
    await writeOutboxFailed([op({ attempts: 0 })]);
    await retryOutboxFailed();
    expect(await readOutboxFailed()).toHaveLength(0);
    expect(await readOutboxQueue()).toHaveLength(0); // flushed successfully
    expect(orderCreate).toHaveBeenCalledTimes(1);
  });

  it('retries ONLY the requested group when given a groupId', async () => {
    await writeOutboxFailed([
      op({ lastError: 'boom g1' }),
      op({ groupId: 'g2', recordId: 'g2', lastError: 'boom g2' }),
    ]);
    await retryOutboxFailed('g1');
    // g1 revived + flushed; g2 stays in the failed queue untouched.
    const failed = await readOutboxFailed();
    expect(failed).toHaveLength(1);
    expect(failed[0].groupId).toBe('g2');
    expect(failed[0].lastError).toBe('boom g2');
    expect(await readOutboxQueue()).toHaveLength(0);
    expect(orderCreate).toHaveBeenCalledTimes(1);
    expect(orderCreate).toHaveBeenCalledWith({ id: 'g1' });
  });

  it('clears lastError on revive', async () => {
    // Auth error aborts the flush without consuming the op, so the revived op
    // is still observable in the queue afterwards.
    orderCreate.mockRejectedValueOnce(new Error('JWT expired'));
    await writeOutboxFailed([op({ lastError: 'boom' })]);
    await retryOutboxFailed('g1');
    const queue = await readOutboxQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].attempts).toBe(0);
    expect(queue[0].lastError).toBeUndefined();
  });
});
