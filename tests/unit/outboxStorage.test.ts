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

// removeQueuedFileUpload cleans staged files via a dynamic expo-file-system import.
const deleteAsync = vi.fn(async (..._a: unknown[]) => undefined);
vi.mock('expo-file-system/legacy', () => ({
  deleteAsync: (...a: unknown[]) => deleteAsync(...a),
}));

import {
  enqueueOutboxOp,
  readOutboxQueue,
  readOutboxFailed,
  writeOutboxFailed,
  reviveFailedGroup,
  pendingInspectionIds,
  hasQueuedEquipmentWrite,
  removeQueuedFileUpload,
} from '../../lib/outbox/storage';
import type { EquipmentPatchOp, InspectionCreateOp, NewOutboxOp, OutboxOp, RecordSaveOp } from '../../lib/outbox/types';

type NewRecordSaveOp = Extract<NewOutboxOp, { kind: 'record_save' }>;
type NewEquipmentPatchOp = Extract<NewOutboxOp, { kind: 'equipment_patch' }>;

const inspectionCreateOp = (id: string): Extract<NewOutboxOp, { kind: 'inspection_create' }> => ({
  kind: 'inspection_create',
  groupId: id,
  variant: 'equipment',
  inspectionId: id,
  projectId: 'p1',
  rpcArgs: { p_id: id },
  table: 'bobcat_inspections',
  insertRow: { id, status: 'draft', items: [] },
  displayTitle: '',
});

const equipmentPatchOp = (
  id: string,
  patch: Record<string, unknown>,
  syncParent: NewEquipmentPatchOp['syncParent'] = null,
): NewEquipmentPatchOp => ({
  kind: 'equipment_patch',
  groupId: id,
  inspectionId: id,
  table: 'bobcat_inspections',
  patch,
  syncParent,
  displayTitle: '',
});

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

describe('enqueueOutboxOp — equipment_patch coalescing', () => {
  it('folds a patch into the still-queued inspection_create insertRow (edit-after-queued-create)', async () => {
    await enqueueOutboxOp(inspectionCreateOp('i1'));
    await enqueueOutboxOp(equipmentPatchOp('i1', { serial_number: 'SN-9', items: [{ id: 1 }] }));
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    const op = ops[0] as InspectionCreateOp;
    expect(op.kind).toBe('inspection_create');
    expect(op.insertRow).toEqual({ id: 'i1', status: 'draft', serial_number: 'SN-9', items: [{ id: 1 }] });
  });

  it('folds successive patches of the same row into one op', async () => {
    await enqueueOutboxOp(equipmentPatchOp('i1', { serial_number: 'SN-1' }));
    await enqueueOutboxOp(equipmentPatchOp('i1', { serial_number: 'SN-2', notes: 'x' }));
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    expect((ops[0] as EquipmentPatchOp).patch).toEqual({ serial_number: 'SN-2', notes: 'x' });
  });

  it('a completion (syncParent) always APPENDS so the parent mirror replays after the row exists', async () => {
    await enqueueOutboxOp(inspectionCreateOp('i1'));
    await enqueueOutboxOp(
      equipmentPatchOp('i1', { status: 'completed', completed_at: 'T' }, { status: 'completed', completedAt: 'T' }),
    );
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(2);
    expect(ops[0].kind).toBe('inspection_create');
    expect(ops[1].kind).toBe('equipment_patch');
    expect((ops[1] as EquipmentPatchOp).syncParent).toEqual({ status: 'completed', completedAt: 'T' });
  });

  it('does NOT coalesce across different inspections', async () => {
    await enqueueOutboxOp(equipmentPatchOp('i1', { notes: 'a' }));
    await enqueueOutboxOp(equipmentPatchOp('i2', { notes: 'b' }));
    expect(await readOutboxQueue()).toHaveLength(2);
  });
});

describe('hasQueuedEquipmentWrite', () => {
  it('sees queued creations and patches for the id, nothing else', async () => {
    await enqueueOutboxOp(inspectionCreateOp('i1'));
    await enqueueOutboxOp(equipmentPatchOp('i2', { notes: 'x' }));
    expect(await hasQueuedEquipmentWrite('i1')).toBe(true);
    expect(await hasQueuedEquipmentWrite('i2')).toBe(true);
    expect(await hasQueuedEquipmentWrite('i3')).toBe(false);
  });
});

describe('removeQueuedFileUpload', () => {
  const fileOp = (path: string): Extract<NewOutboxOp, { kind: 'file_upload' }> => ({
    kind: 'file_upload',
    groupId: 'i1',
    bucket: 'answer-photos',
    path,
    localUri: `file:///staged/${path.split('/').pop()}`,
    contentType: 'image/jpeg',
    displayTitle: '',
  });

  it('drops the queued upload, deletes its staged file, and reports true', async () => {
    await enqueueOutboxOp(fileOp('bobcat/i1/1/a.jpg'));
    await enqueueOutboxOp(fileOp('bobcat/i1/2/b.jpg'));
    expect(await removeQueuedFileUpload('answer-photos', 'bobcat/i1/1/a.jpg')).toBe(true);
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    expect((ops[0] as { path: string }).path).toBe('bobcat/i1/2/b.jpg');
    // Dynamic-import cleanup is fire-and-forget — let the microtask run.
    await new Promise((r) => setTimeout(r, 0));
    expect(deleteAsync).toHaveBeenCalledWith('file:///staged/a.jpg', { idempotent: true });
  });

  it('reports false when nothing is queued for the path', async () => {
    expect(await removeQueuedFileUpload('answer-photos', 'missing.jpg')).toBe(false);
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
