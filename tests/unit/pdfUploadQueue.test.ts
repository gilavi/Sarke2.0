import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory AsyncStorage backing store ──────────────────────────────────
const asyncStore: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => (k in asyncStore ? asyncStore[k] : null)),
    setItem: vi.fn(async (k: string, v: string) => {
      asyncStore[k] = v;
    }),
    removeItem: vi.fn(async (k: string) => {
      delete asyncStore[k];
    }),
    getAllKeys: vi.fn(async () => Object.keys(asyncStore)),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const k of keys) delete asyncStore[k];
    }),
  },
}));

// ── expo-file-system/legacy ───────────────────────────────────────────────
// `dirState` lets each test choose documentDirectory / cacheDirectory and how
// getInfoAsync / copyAsync behave.
const dirState = {
  documentDirectory: '/docs/' as string | null,
  cacheDirectory: '/cache/' as string | null,
  getInfoExists: false,
  getInfoThrows: false,
  copyThrows: false,
};

const getInfoAsync = vi.fn(async (_dir: string) => {
  if (dirState.getInfoThrows) throw new Error('getInfo boom');
  return { exists: dirState.getInfoExists };
});
const makeDirectoryAsync = vi.fn(async (..._args: any[]) => undefined);
const copyAsync = vi.fn(async (..._args: any[]) => {
  if (dirState.copyThrows) throw new Error('copy boom');
  return undefined;
});
const deleteAsync = vi.fn(async (..._args: any[]) => undefined);

vi.mock('expo-file-system/legacy', () => ({
  get documentDirectory() {
    return dirState.documentDirectory;
  },
  get cacheDirectory() {
    return dirState.cacheDirectory;
  },
  getInfoAsync: (...args: any[]) => getInfoAsync(...(args as [string])),
  makeDirectoryAsync: (...args: any[]) => makeDirectoryAsync(...args),
  copyAsync: (...args: any[]) => copyAsync(...args),
  deleteAsync: (...args: any[]) => deleteAsync(...args),
}));

// ── expo-crypto: deterministic incrementing id ────────────────────────────
let uuidCounter = 0;
vi.mock('expo-crypto', () => ({
  randomUUID: () => `uuid-${++uuidCounter}`,
}));

// ── lib/services ──────────────────────────────────────────────────────────
const uploadFromUri = vi.fn(async (..._args: any[]) => undefined);
const listByInspection = vi.fn(async (..._args: any[]) => [] as any[]);
const certCreate = vi.fn(async (..._args: any[]) => undefined);
const incidentUpdate = vi.fn(async (..._args: any[]) => undefined);

vi.mock('../../lib/services', () => ({
  storageApi: {
    uploadFromUri: (...args: any[]) => uploadFromUri(...args),
  },
  certificatesApi: {
    listByInspection: (...args: any[]) => listByInspection(...args),
    create: (...args: any[]) => certCreate(...args),
  },
  incidentsApi: {
    update: (...args: any[]) => incidentUpdate(...args),
  },
}));

// ── lib/logError ──────────────────────────────────────────────────────────
const logError = vi.fn();
vi.mock('../../lib/logError', () => ({
  logError: (...args: any[]) => logError(...args),
}));

const {
  stagePdfForQueue,
  queuePdfUpload,
  removePendingPdfUpload,
  flushPendingPdfUploads,
  pendingPdfUploadCount,
} = await import('../../lib/pdfUploadQueue');

const PENDING_KEY = 'pending-pdf-uploads';

beforeEach(() => {
  for (const k of Object.keys(asyncStore)) delete asyncStore[k];
  dirState.documentDirectory = '/docs/';
  dirState.cacheDirectory = '/cache/';
  dirState.getInfoExists = false;
  dirState.getInfoThrows = false;
  dirState.copyThrows = false;
  uuidCounter = 0;
  vi.clearAllMocks();
});

// Helpers to read/seed the persisted queue directly.
async function readQueue(): Promise<any[]> {
  const raw = asyncStore[PENDING_KEY];
  return raw ? JSON.parse(raw) : [];
}
function seedQueue(list: any[]): void {
  asyncStore[PENDING_KEY] = JSON.stringify(list);
}

// ───────────────────────────────────────────────────────────────────────────
describe('stagePdfForQueue', () => {
  it('copies into the staging dir and returns the staged uri on success', async () => {
    const before = Date.now();
    const result = await stagePdfForQueue('file:///tmp/report.pdf', 'report.pdf');
    expect(result.startsWith('/docs/pdf-upload-staging/')).toBe(true);
    expect(result.endsWith('-report.pdf')).toBe(true);
    // copyAsync was called from the temp uri to the staged path.
    expect(copyAsync).toHaveBeenCalledTimes(1);
    expect(copyAsync.mock.calls[0][0]).toEqual({
      from: 'file:///tmp/report.pdf',
      to: result,
    });
    // The embedded timestamp is a real Date.now()-ish value.
    const ts = Number(result.split('pdf-upload-staging/')[1].split('-')[0]);
    expect(ts).toBeGreaterThanOrEqual(before);
  });

  it('creates the staging dir when getInfoAsync reports it is missing', async () => {
    dirState.getInfoExists = false;
    await stagePdfForQueue('file:///tmp/a.pdf', 'a.pdf');
    expect(makeDirectoryAsync).toHaveBeenCalledTimes(1);
    expect(makeDirectoryAsync.mock.calls[0][0]).toBe('/docs/pdf-upload-staging/');
    expect(makeDirectoryAsync.mock.calls[0][1]).toEqual({ intermediates: true });
  });

  it('does NOT create the staging dir when it already exists', async () => {
    dirState.getInfoExists = true;
    await stagePdfForQueue('file:///tmp/a.pdf', 'a.pdf');
    expect(makeDirectoryAsync).not.toHaveBeenCalled();
    expect(copyAsync).toHaveBeenCalledTimes(1);
  });

  it('sanitizes illegal characters in nameHint to underscores', async () => {
    const result = await stagePdfForQueue('file:///tmp/x.pdf', 'რეპორტ #1/v2 (final).pdf');
    const fileName = result.split('pdf-upload-staging/')[1];
    const afterTs = fileName.slice(fileName.indexOf('-') + 1);
    // Only [a-zA-Z0-9_.-] survive; everything else becomes '_'.
    expect(afterTs).toBe('________1_v2__final_.pdf');
    expect(afterTs).toMatch(/^[a-zA-Z0-9_.-]+$/);
  });

  it('falls back to cacheDirectory when documentDirectory is null', async () => {
    dirState.documentDirectory = null;
    dirState.cacheDirectory = '/cache/';
    const result = await stagePdfForQueue('file:///tmp/a.pdf', 'a.pdf');
    expect(result.startsWith('/cache/pdf-upload-staging/')).toBe(true);
  });

  it('returns the original tempUri when both base directories are null', async () => {
    dirState.documentDirectory = null;
    dirState.cacheDirectory = null;
    const result = await stagePdfForQueue('file:///tmp/orig.pdf', 'orig.pdf');
    expect(result).toBe('file:///tmp/orig.pdf');
    expect(copyAsync).not.toHaveBeenCalled();
  });

  it('returns the original tempUri when ensureStageDir getInfo throws', async () => {
    dirState.getInfoThrows = true;
    const result = await stagePdfForQueue('file:///tmp/orig.pdf', 'orig.pdf');
    expect(result).toBe('file:///tmp/orig.pdf');
    expect(copyAsync).not.toHaveBeenCalled();
  });

  it('returns the original tempUri when copyAsync throws', async () => {
    dirState.copyThrows = true;
    const result = await stagePdfForQueue('file:///tmp/orig.pdf', 'orig.pdf');
    expect(result).toBe('file:///tmp/orig.pdf');
    expect(copyAsync).toHaveBeenCalledTimes(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('queuePdfUpload', () => {
  it('appends an item with a fresh id and attempts:0, returning the id', async () => {
    const id = await queuePdfUpload({
      localUri: 'file:///s/a.pdf',
      bucket: 'pdfs',
      path: 'a.pdf',
      contentType: 'application/pdf',
      dbOp: { kind: 'none' },
    });
    expect(id).toBe('uuid-1');
    const list = await readQueue();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: 'uuid-1',
      attempts: 0,
      localUri: 'file:///s/a.pdf',
      bucket: 'pdfs',
      path: 'a.pdf',
      contentType: 'application/pdf',
      dbOp: { kind: 'none' },
    });
  });

  it('preserves existing items and assigns sequential ids on subsequent calls', async () => {
    const id1 = await queuePdfUpload({
      localUri: 'file:///s/a.pdf',
      bucket: 'pdfs',
      path: 'a.pdf',
      contentType: 'application/pdf',
      dbOp: { kind: 'none' },
    });
    const id2 = await queuePdfUpload({
      localUri: 'file:///s/b.pdf',
      bucket: 'pdfs',
      path: 'b.pdf',
      contentType: 'application/pdf',
      dbOp: { kind: 'none' },
    });
    expect(id1).toBe('uuid-1');
    expect(id2).toBe('uuid-2');
    const list = await readQueue();
    expect(list.map((p) => p.id)).toEqual(['uuid-1', 'uuid-2']);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('readPending tolerance (via pendingPdfUploadCount)', () => {
  it('returns 0 when nothing is stored', async () => {
    expect(await pendingPdfUploadCount()).toBe(0);
  });

  it('returns 0 when stored JSON is corrupt', async () => {
    asyncStore[PENDING_KEY] = '{not valid json';
    expect(await pendingPdfUploadCount()).toBe(0);
  });

  it('returns 0 when stored JSON is a non-array', async () => {
    asyncStore[PENDING_KEY] = JSON.stringify({ foo: 'bar' });
    expect(await pendingPdfUploadCount()).toBe(0);
  });

  it('counts items in a valid array', async () => {
    seedQueue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(await pendingPdfUploadCount()).toBe(3);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('removePendingPdfUpload', () => {
  it('removes only the matching id', async () => {
    seedQueue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    await removePendingPdfUpload('b');
    const list = await readQueue();
    expect(list.map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('is a no-op when the id is absent', async () => {
    seedQueue([{ id: 'a' }, { id: 'b' }]);
    await removePendingPdfUpload('zzz');
    const list = await readQueue();
    expect(list.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('writes an empty array when removing the only item', async () => {
    seedQueue([{ id: 'a' }]);
    await removePendingPdfUpload('a');
    expect(await readQueue()).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('flushPendingPdfUploads', () => {
  it('is a no-op when the queue is empty', async () => {
    await flushPendingPdfUploads();
    expect(uploadFromUri).not.toHaveBeenCalled();
    // No write happens for the empty-queue early return.
    expect(asyncStore[PENDING_KEY]).toBeUndefined();
  });

  it("dbOp 'none': uploads, clears the queue, deletes the local temp", async () => {
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'none' },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    expect(uploadFromUri).toHaveBeenCalledTimes(1);
    expect(uploadFromUri).toHaveBeenCalledWith(
      'pdfs',
      'a.pdf',
      'file:///s/a.pdf',
      'application/pdf',
    );
    expect(certCreate).not.toHaveBeenCalled();
    expect(incidentUpdate).not.toHaveBeenCalled();
    expect(deleteAsync).toHaveBeenCalledWith('file:///s/a.pdf', { idempotent: true });
    expect(await readQueue()).toEqual([]);
  });

  it('certificate_create: inserts when no existing pdf_url matches', async () => {
    listByInspection.mockResolvedValueOnce([{ pdf_url: 'other.pdf' }]);
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: {
          kind: 'certificate_create',
          payload: {
            inspectionId: 'insp-1',
            templateId: 'tmpl-1',
            pdfUrl: 'mine.pdf',
            isSafeForUse: true,
            conclusionText: 'ok',
            params: { a: 1 },
            pdf_hash: 'h1',
          },
        },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    expect(listByInspection).toHaveBeenCalledWith('insp-1');
    expect(certCreate).toHaveBeenCalledTimes(1);
    expect(certCreate).toHaveBeenCalledWith({
      inspectionId: 'insp-1',
      templateId: 'tmpl-1',
      pdfUrl: 'mine.pdf',
      isSafeForUse: true,
      conclusionText: 'ok',
      params: { a: 1 },
      pdf_hash: 'h1',
    });
    expect(await readQueue()).toEqual([]);
  });

  it('certificate_create: SKIPS insert when an existing cert already has the pdf_url (dedup)', async () => {
    listByInspection.mockResolvedValueOnce([
      { pdf_url: 'mine.pdf' },
      { pdf_url: 'other.pdf' },
    ]);
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: {
          kind: 'certificate_create',
          payload: {
            inspectionId: 'insp-1',
            templateId: 'tmpl-1',
            pdfUrl: 'mine.pdf',
            isSafeForUse: false,
            conclusionText: null,
          },
        },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    expect(uploadFromUri).toHaveBeenCalledTimes(1);
    expect(certCreate).not.toHaveBeenCalled();
    // Dedup is still a success: item is removed and temp deleted.
    expect(deleteAsync).toHaveBeenCalledWith('file:///s/a.pdf', { idempotent: true });
    expect(await readQueue()).toEqual([]);
  });

  it('incident_update: updates with pdf_url + status, including pdf_hash when present', async () => {
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'incident-photos',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: {
          kind: 'incident_update',
          payload: {
            incidentId: 'inc-1',
            pdf_url: 'inc.pdf',
            status: 'closed',
            pdf_hash: 'hh',
          },
        },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    expect(incidentUpdate).toHaveBeenCalledWith('inc-1', {
      pdf_url: 'inc.pdf',
      status: 'closed',
      pdf_hash: 'hh',
    });
    expect(await readQueue()).toEqual([]);
  });

  it('incident_update: omits pdf_hash key when absent', async () => {
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'incident-photos',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: {
          kind: 'incident_update',
          payload: { incidentId: 'inc-1', pdf_url: 'inc.pdf' },
        },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    expect(incidentUpdate).toHaveBeenCalledTimes(1);
    const arg = incidentUpdate.mock.calls[0][1];
    expect(arg).toEqual({ pdf_url: 'inc.pdf', status: undefined });
    expect('pdf_hash' in arg).toBe(false);
  });

  it('retries on upload failure: increments attempts and keeps the item below MAX_RETRIES', async () => {
    uploadFromUri.mockRejectedValueOnce(new Error('network down'));
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'none' },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    const list = await readQueue();
    expect(list).toHaveLength(1);
    expect(list[0].attempts).toBe(1);
    expect(logError).not.toHaveBeenCalled();
    // Item kept; local temp NOT deleted on a retry.
    expect(deleteAsync).not.toHaveBeenCalled();
  });

  it('keeps an item with attempts:1 -> 2 (still below MAX_RETRIES)', async () => {
    uploadFromUri.mockRejectedValueOnce(new Error('still down'));
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'none' },
        attempts: 1,
      },
    ]);
    await flushPendingPdfUploads();
    const list = await readQueue();
    expect(list).toHaveLength(1);
    expect(list[0].attempts).toBe(2);
    expect(logError).not.toHaveBeenCalled();
  });

  it('drops + logError + deletes file at attempts >= MAX_RETRIES', async () => {
    uploadFromUri.mockRejectedValueOnce(new Error('permanently down'));
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'certificate_create', payload: {} },
        attempts: 2, // → becomes 3 == MAX_RETRIES
      },
    ]);
    await flushPendingPdfUploads();
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0][1]).toBe('pdfUploadQueue.drop.certificate_create');
    expect(deleteAsync).toHaveBeenCalledWith('file:///s/a.pdf', { idempotent: true });
    // Item is dropped from the queue.
    expect(await readQueue()).toEqual([]);
  });

  it('processes a mixed batch: one succeeds, one retries', async () => {
    uploadFromUri
      .mockResolvedValueOnce(undefined) // item a succeeds
      .mockRejectedValueOnce(new Error('b fails')); // item b retries
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'none' },
        attempts: 0,
      },
      {
        id: 'b',
        localUri: 'file:///s/b.pdf',
        bucket: 'pdfs',
        path: 'b.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'none' },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    const list = await readQueue();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('b');
    expect(list[0].attempts).toBe(1);
  });

  it('treats a missing attempts field as 0 when incrementing on failure', async () => {
    uploadFromUri.mockRejectedValueOnce(new Error('down'));
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'none' },
        // attempts intentionally omitted
      },
    ]);
    await flushPendingPdfUploads();
    const list = await readQueue();
    expect(list[0].attempts).toBe(1);
  });

  it('single-flight: a second concurrent flush is a no-op while one is in-flight', async () => {
    // Hold the first flush open with a deferred uploadFromUri.
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    uploadFromUri.mockImplementationOnce(async () => {
      await gate;
    });
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'none' },
        attempts: 0,
      },
    ]);

    const first = flushPendingPdfUploads();
    // Let the first flush reach the awaiting uploadFromUri.
    await Promise.resolve();
    // Second flush should bail immediately without any extra upload.
    await flushPendingPdfUploads();
    expect(uploadFromUri).toHaveBeenCalledTimes(1);

    // Release the first flush and let it finish.
    release();
    await first;
    expect(uploadFromUri).toHaveBeenCalledTimes(1);
    expect(await readQueue()).toEqual([]);
  });

  it('releases the single-flight guard so a later flush runs again', async () => {
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'none' },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    expect(uploadFromUri).toHaveBeenCalledTimes(1);

    // Queue another and flush again — guard must be free.
    seedQueue([
      {
        id: 'b',
        localUri: 'file:///s/b.pdf',
        bucket: 'pdfs',
        path: 'b.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'none' },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    expect(uploadFromUri).toHaveBeenCalledTimes(2);
  });

  // ── Partial-failure: storage upload SUCCEEDS but the DB write throws ────────
  // The single try block wraps upload + DB op + temp delete, so a DB failure
  // routes to the SAME catch as an upload failure: the PDF is already in
  // storage, but the cert/incident row was never written, and the item retries.
  // On the retry the dedup guard (existing.some(c => c.pdf_url === pdfUrl))
  // becomes load-bearing.
  it('certificate_create: a failing certCreate retries the item (PDF already uploaded)', async () => {
    certCreate.mockRejectedValueOnce(new Error('db write failed'));
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: {
          kind: 'certificate_create',
          payload: { inspectionId: 'insp-1', templateId: 't', pdfUrl: 'mine.pdf', isSafeForUse: true, conclusionText: null },
        },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    // Upload happened; cert insert was attempted and threw.
    expect(uploadFromUri).toHaveBeenCalledTimes(1);
    expect(certCreate).toHaveBeenCalledTimes(1);
    // Item is retried, not dropped; temp file NOT deleted on a sub-MAX retry.
    const list = await readQueue();
    expect(list).toHaveLength(1);
    expect(list[0].attempts).toBe(1);
    expect(logError).not.toHaveBeenCalled();
    expect(deleteAsync).not.toHaveBeenCalled();
  });

  it('certificate_create: a failing listByInspection (dedup lookup) retries the item', async () => {
    listByInspection.mockRejectedValueOnce(new Error('lookup failed'));
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: {
          kind: 'certificate_create',
          payload: { inspectionId: 'insp-1', templateId: 't', pdfUrl: 'mine.pdf', isSafeForUse: true, conclusionText: null },
        },
        attempts: 1,
      },
    ]);
    await flushPendingPdfUploads();
    expect(certCreate).not.toHaveBeenCalled(); // never reached — lookup threw first
    const list = await readQueue();
    expect(list).toHaveLength(1);
    expect(list[0].attempts).toBe(2);
  });

  it('incident_update: a failing incidentUpdate retries the item', async () => {
    incidentUpdate.mockRejectedValueOnce(new Error('update failed'));
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'incident-photos',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: { kind: 'incident_update', payload: { incidentId: 'inc-1', pdf_url: 'inc.pdf' } },
        attempts: 0,
      },
    ]);
    await flushPendingPdfUploads();
    expect(uploadFromUri).toHaveBeenCalledTimes(1);
    expect(incidentUpdate).toHaveBeenCalledTimes(1);
    const list = await readQueue();
    expect(list[0].attempts).toBe(1);
  });

  it('certificate_create: a DB failure at attempts >= MAX drops + logErrors + deletes the temp', async () => {
    certCreate.mockRejectedValueOnce(new Error('db down for good'));
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: {
          kind: 'certificate_create',
          payload: { inspectionId: 'insp-1', templateId: 't', pdfUrl: 'mine.pdf', isSafeForUse: true, conclusionText: null },
        },
        attempts: 2, // → 3 == MAX_RETRIES on this DB failure
      },
    ]);
    await flushPendingPdfUploads();
    expect(uploadFromUri).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0][1]).toBe('pdfUploadQueue.drop.certificate_create');
    expect(deleteAsync).toHaveBeenCalledWith('file:///s/a.pdf', { idempotent: true });
    expect(await readQueue()).toEqual([]);
  });

  it('dedup guard is load-bearing after a DB-failure retry: a prior cert with the same pdf_url skips re-insert', async () => {
    // Simulate the retry after a partial failure: the PDF + a cert row already
    // exist from the first (failed-after-insert) attempt. The re-run must NOT
    // create a duplicate cert (there is no DB unique constraint).
    listByInspection.mockResolvedValueOnce([{ pdf_url: 'mine.pdf' }]);
    seedQueue([
      {
        id: 'a',
        localUri: 'file:///s/a.pdf',
        bucket: 'pdfs',
        path: 'a.pdf',
        contentType: 'application/pdf',
        dbOp: {
          kind: 'certificate_create',
          payload: { inspectionId: 'insp-1', templateId: 't', pdfUrl: 'mine.pdf', isSafeForUse: true, conclusionText: null },
        },
        attempts: 1,
      },
    ]);
    await flushPendingPdfUploads();
    expect(certCreate).not.toHaveBeenCalled();
    expect(deleteAsync).toHaveBeenCalledWith('file:///s/a.pdf', { idempotent: true });
    expect(await readQueue()).toEqual([]);
  });
});
