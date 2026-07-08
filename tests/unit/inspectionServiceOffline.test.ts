/**
 * Unit tests for makeInspectionService's offline branches
 * (lib/inspection/service.ts): patch/complete queue equipment_patch outbox
 * ops when offline (or on a network-classified failure), the pending-write
 * guard coalesces an online patch into a still-queued creation instead of
 * silently no-op-updating a row that doesn't exist yet, uploadPhotoAt stages
 * the photo + queues a file_upload op and still resolves with the final
 * storage path, and deletePhoto of a never-uploaded photo just drops its
 * queued op. This is the fix for "equipment inspection flows lose all work
 * done offline" — only creation used to queue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  return { randomUUID: () => `uuid-${++n}` };
});
vi.mock('expo-file-system/legacy', () => ({ deleteAsync: vi.fn(async () => undefined) }));
vi.mock('../../lib/logError', () => ({ logError: vi.fn() }));

type UpdateCall = { table: string; payload: Record<string, unknown>; id: unknown };
const updateCalls: UpdateCall[] = [];
let failUpdatesWith: Error | null = null;
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => ({
        eq: async (_col: string, id: unknown) => {
          if (failUpdatesWith) return { error: { message: failUpdatesWith.message } };
          updateCalls.push({ table, payload, id });
          return { error: null };
        },
      }),
    }),
  },
  STORAGE_BUCKETS: { answerPhotos: 'answer-photos' },
}));

const uploadFromUri = vi.fn(async (..._a: unknown[]) => undefined);
const removeMock = vi.fn(async (..._a: unknown[]) => undefined);
vi.mock('../../lib/services', () => ({
  storageApi: {
    uploadFromUri: (...a: unknown[]) => uploadFromUri(...a),
    remove: (...a: unknown[]) => removeMock(...a),
  },
}));

// service.ts loads these lazily on the staging path (dynamic import).
const stageMock = vi.fn(async (..._a: unknown[]) => 'file:///staged/photo.jpg');
vi.mock('../../lib/photoCompression', () => ({
  stageCompressedPhotoForOffline: (...a: unknown[]) => stageMock(...a),
}));
const seedMock = vi.fn();
vi.mock('../../lib/imageOfflineCache', () => ({
  seedDisplayCacheFromLocalFile: (...a: unknown[]) => seedMock(...a),
}));

import { onlineManager } from '@tanstack/react-query';
import { makeInspectionService } from '../../lib/inspection/service';
import { enqueueOutboxOp, readOutboxQueue } from '../../lib/outbox/storage';
import type { EquipmentPatchOp, FileUploadOp } from '../../lib/outbox/types';

const svc = makeInspectionService<Record<string, unknown>, Record<string, unknown>>({
  table: 'bobcat_inspections',
  pathPrefix: 'bobcat',
  inspectionType: 'bobcat',
  toModel: (r) => r,
  toDb: (p) => p,
  createColumns: () => ({}),
});

beforeEach(() => {
  store.clear();
  updateCalls.length = 0;
  failUpdatesWith = null;
  uploadFromUri.mockReset().mockResolvedValue(undefined);
  removeMock.mockClear();
  stageMock.mockClear();
  seedMock.mockClear();
  onlineManager.setOnline(true);
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('patch — offline queueing', () => {
  it('queues an equipment_patch instead of writing when offline', async () => {
    onlineManager.setOnline(false);
    await svc.patch('i1', { serial_number: 'SN-1' });
    expect(updateCalls).toHaveLength(0);
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    const op = ops[0] as EquipmentPatchOp;
    expect(op.kind).toBe('equipment_patch');
    expect(op.table).toBe('bobcat_inspections');
    expect(op.groupId).toBe('i1');
    expect(op.patch).toEqual({ serial_number: 'SN-1' });
    expect(op.syncParent).toBeNull();
  });

  it('coalesces a whole offline autosave session into ONE op', async () => {
    onlineManager.setOnline(false);
    await svc.patch('i1', { serial_number: 'SN-1' });
    await svc.patch('i1', { serial_number: 'SN-2', notes: 'x' });
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    expect((ops[0] as EquipmentPatchOp).patch).toEqual({ serial_number: 'SN-2', notes: 'x' });
  });

  it('pending-write guard: an ONLINE patch for a row whose creation is still queued coalesces into it', async () => {
    await enqueueOutboxOp({
      kind: 'inspection_create',
      groupId: 'i1',
      variant: 'equipment',
      inspectionId: 'i1',
      projectId: 'p1',
      rpcArgs: { p_id: 'i1' },
      table: 'bobcat_inspections',
      insertRow: { id: 'i1', status: 'draft' },
      displayTitle: '',
    });
    await svc.patch('i1', { notes: 'edited after queued create' });
    // No direct UPDATE — it would silently no-op (row doesn't exist yet).
    expect(updateCalls).toHaveLength(0);
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    expect((ops[0] as { insertRow: Record<string, unknown> }).insertRow.notes).toBe('edited after queued create');
  });

  it('falls back to the queue on a network-classified failure, rethrows anything else', async () => {
    failUpdatesWith = new Error('Network request failed');
    await svc.patch('i1', { notes: 'x' });
    expect(await readOutboxQueue()).toHaveLength(1);

    store.clear();
    failUpdatesWith = new Error('violates row-level security policy');
    await expect(svc.patch('i2', { notes: 'y' })).rejects.toThrow('row-level security');
    expect(await readOutboxQueue()).toHaveLength(0);
  });

  it('writes directly when online with nothing queued', async () => {
    await svc.patch('i1', { notes: 'x' });
    expect(updateCalls).toEqual([{ table: 'bobcat_inspections', payload: { notes: 'x' }, id: 'i1' }]);
    expect(await readOutboxQueue()).toHaveLength(0);
  });
});

describe('complete — offline queueing', () => {
  it('queues ONE op carrying both the row update and the parent mirror', async () => {
    onlineManager.setOnline(false);
    await svc.complete('i1');
    expect(updateCalls).toHaveLength(0);
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    const op = ops[0] as EquipmentPatchOp;
    expect(op.patch.status).toBe('completed');
    expect(typeof op.patch.completed_at).toBe('string');
    expect(op.syncParent?.status).toBe('completed');
    expect(op.syncParent?.completedAt).toBe(op.patch.completed_at);
  });

  it('a completion after offline edits appends behind the coalesced patch (group FIFO)', async () => {
    onlineManager.setOnline(false);
    await svc.patch('i1', { notes: 'x' });
    await svc.complete('i1');
    const ops = await readOutboxQueue();
    expect(ops.map((o) => o.kind)).toEqual(['equipment_patch', 'equipment_patch']);
    expect((ops[0] as EquipmentPatchOp).syncParent).toBeNull();
    expect((ops[1] as EquipmentPatchOp).syncParent).not.toBeNull();
  });
});

describe('uploadPhotoAt — offline staging', () => {
  it('stages the photo, queues a file_upload grouped under the inspection, and returns the final path', async () => {
    onlineManager.setOnline(false);
    const path = await svc.uploadPhotoAt('i1/3', 'file:///camera/raw.jpg');
    expect(path).toMatch(/^bobcat\/i1\/3\/uuid-\d+\.jpg$/);
    expect(uploadFromUri).not.toHaveBeenCalled();
    expect(stageMock).toHaveBeenCalledWith('file:///camera/raw.jpg', 'inspection');
    const ops = await readOutboxQueue();
    expect(ops).toHaveLength(1);
    const op = ops[0] as FileUploadOp;
    expect(op.kind).toBe('file_upload');
    expect(op.groupId).toBe('i1');
    expect(op.bucket).toBe('answer-photos');
    expect(op.path).toBe(path);
    expect(op.localUri).toBe('file:///staged/photo.jpg');
    // Display cache seeded so the photo renders offline immediately.
    await new Promise((r) => setTimeout(r, 0));
    expect(seedMock).toHaveBeenCalledWith('answer-photos', path, 'file:///staged/photo.jpg');
  });

  it('stages on a network-classified upload failure while "online"', async () => {
    uploadFromUri.mockRejectedValueOnce(new Error('Network request failed'));
    const path = await svc.uploadPhotoAt('i1/3', 'file:///camera/raw.jpg');
    expect(path).toMatch(/^bobcat\/i1\/3\//);
    expect(await readOutboxQueue()).toHaveLength(1);
  });

  it('rethrows non-network upload failures', async () => {
    uploadFromUri.mockRejectedValueOnce(new Error('Payload too large'));
    await expect(svc.uploadPhotoAt('i1/3', 'file:///camera/raw.jpg')).rejects.toThrow('too large');
    expect(await readOutboxQueue()).toHaveLength(0);
  });
});

describe('deletePhoto — queued upload', () => {
  it('drops the queued file_upload instead of calling storage remove', async () => {
    onlineManager.setOnline(false);
    const path = await svc.uploadPhotoAt('i1/3', 'file:///camera/raw.jpg');
    await svc.deletePhoto(path);
    expect(await readOutboxQueue()).toHaveLength(0);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('still removes an already-uploaded photo from storage', async () => {
    await svc.deletePhoto('bobcat/i1/3/old.jpg');
    expect(removeMock).toHaveBeenCalledWith('answer-photos', 'bobcat/i1/3/old.jpg');
  });
});
