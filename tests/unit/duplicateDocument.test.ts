/**
 * Unit tests for the duplicateDocument orchestrator.
 *
 * Every service is mocked; the assertions are on WHAT the orchestrator calls —
 * proving each type clones into a fresh DRAFT and copies everything the schema
 * persists (incl. signatures/certs), that act photo blobs are server-copied to
 * new paths (so the draft is independent), and that the record lists are
 * invalidated afterwards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({
  inspectionsApi: { getById: vi.fn(), create: vi.fn(), update: vi.fn() },
  inspectionAttachmentsApi: { listByInspection: vi.fn(), create: vi.fn() },
  answersApi: { list: vi.fn(), photosByAnswerIds: vi.fn(), upsert: vi.fn(), addPhoto: vi.fn() },
  incidentsApi: { getById: vi.fn(), create: vi.fn() },
  reportsApi: { getById: vi.fn(), create: vi.fn(), update: vi.fn() },
  storageApi: { copy: vi.fn() },
  briefingsApi: { getById: vi.fn(), create: vi.fn(), update: vi.fn() },
  invalidateRecordLists: vi.fn(),
  uuid: { n: 0 },
}));

const {
  inspectionsApi, inspectionAttachmentsApi, answersApi, incidentsApi, reportsApi,
  storageApi, briefingsApi, invalidateRecordLists,
} = m;

vi.mock('expo-crypto', () => ({ randomUUID: () => `dup-${++m.uuid.n}` }));
vi.mock('../../lib/services', () => ({
  inspectionsApi: m.inspectionsApi,
  inspectionAttachmentsApi: m.inspectionAttachmentsApi,
  answersApi: m.answersApi,
  incidentsApi: m.incidentsApi,
  reportsApi: m.reportsApi,
  storageApi: m.storageApi,
}));
vi.mock('../../lib/briefingsApi', () => ({ briefingsApi: m.briefingsApi }));
vi.mock('../../lib/apiHooks', () => ({ invalidateRecordLists: m.invalidateRecordLists }));
vi.mock('../../lib/logError', () => ({ logError: vi.fn() }));
vi.mock('../../lib/supabase', () => ({
  STORAGE_BUCKETS: { answerPhotos: 'answer-photos', certificates: 'certificates' },
}));

import { duplicateDocument } from '../../lib/documents/duplicate';

const qc = {} as any;

beforeEach(() => {
  vi.clearAllMocks();
  m.uuid.n = 0;
});

describe('duplicateDocument — incident', () => {
  it('clones all fields into a fresh draft (new id, no pdf), copying the expert signature path', async () => {
    incidentsApi.getById.mockResolvedValue({
      id: 'inc-1', user_id: 'u', created_at: 'x', updated_at: 'y',
      project_id: 'p1', type: 'severe', injured_name: 'A', injured_role: 'R',
      date_time: 'd', location: 'L', description: 'desc', cause: 'c', actions_taken: 'a',
      witnesses: ['w'], photos: ['ph1'], inspector_signature: 'sig/expert/u.png',
      status: 'completed', pdf_url: 'pdfs/x.pdf', pdf_hash: 'h',
    });
    incidentsApi.create.mockResolvedValue({ id: 'dup-1' });

    const res = await duplicateDocument({ kind: 'incident', id: 'inc-1' }, qc);

    expect(res.id).toBe('dup-1');
    const arg = incidentsApi.create.mock.calls[0][0];
    expect(arg.id).toBe('dup-1');
    expect(arg.id).not.toBe('inc-1');
    expect(arg.status).toBe('draft');
    expect(arg.pdf_url).toBeNull();
    expect(arg.pdf_hash).toBeNull();
    expect(arg.project_id).toBe('p1');
    expect(arg.photos).toEqual(['ph1']);
    expect(arg.inspector_signature).toBe('sig/expert/u.png'); // copied (persisted)
    expect('user_id' in arg).toBe(false);
    expect(invalidateRecordLists).toHaveBeenCalledWith(qc);
  });
});

describe('duplicateDocument — report', () => {
  it('creates a draft + deep-copies the slides', async () => {
    reportsApi.getById.mockResolvedValue({
      id: 'rep-1', project_id: 'p2', title: 'Monthly', status: 'completed',
      slides: [{ id: 's1', order: 0, title: 'A', description: '', images: [] }],
      pdf_url: 'x', created_at: 'c',
    });
    reportsApi.create.mockResolvedValue({ id: 'dup-1' });

    const res = await duplicateDocument({ kind: 'report', id: 'rep-1' }, qc);

    expect(res.id).toBe('dup-1');
    expect(reportsApi.create).toHaveBeenCalledWith({ projectId: 'p2', title: 'Monthly' });
    const patch = reportsApi.update.mock.calls[0][1];
    expect(patch.status).toBe('draft');
    expect(patch.slides).toHaveLength(1);
    expect(patch.slides[0].id).toBe('s1');
    expect(invalidateRecordLists).toHaveBeenCalled();
  });
});

describe('duplicateDocument — briefing', () => {
  it('creates a draft + copies participants and the persisted expert signature', async () => {
    briefingsApi.getById.mockResolvedValue({
      id: 'br-1', projectId: 'p3', dateTime: 'd', topics: ['ppe'],
      participants: [{ name: 'Nino', signature: 'b64', skipped: false }],
      inspectorSignature: 'expert-b64', inspectorName: 'Giorgi', status: 'completed', createdAt: 'c',
    });
    briefingsApi.create.mockResolvedValue({ id: 'dup-1' });

    const res = await duplicateDocument({ kind: 'briefing', id: 'br-1' }, qc);

    expect(res.id).toBe('dup-1');
    const createArg = briefingsApi.create.mock.calls[0][0];
    expect(createArg.participants).toEqual([{ name: 'Nino', signature: 'b64', skipped: false }]);
    expect(createArg.topics).toEqual(['ppe']);
    const patch = briefingsApi.update.mock.calls[0][1];
    expect(patch.inspectorSignature).toBe('expert-b64');
    // status is set to 'draft' by create() (verified by the create payload),
    // so the update patch only carries the signature.
    expect(patch.status).toBeUndefined();
  });
});

describe('duplicateDocument — act', () => {
  it('clones inspection + answers + attachments, copying photo blobs to new paths', async () => {
    inspectionsApi.getById.mockResolvedValue({
      id: 'insp-1', project_id: 'p4', template_id: 't1', project_item_id: null,
      harness_name: 'Harness #2', conclusion_text: 'ok', is_safe_for_use: true,
      safety_verdict: 'safe', conclusion_photo_paths: ['u/insp-1/concl.jpg'], status: 'completed', created_at: 'c',
    });
    inspectionsApi.create.mockResolvedValue({ id: 'dup-1' });
    answersApi.list.mockResolvedValue([
      { id: 'ans-1', inspection_id: 'insp-1', question_id: 'q1', value_bool: true, value_num: null, value_text: null, grid_values: null, comment: null, notes: null },
    ]);
    answersApi.photosByAnswerIds.mockResolvedValue({
      'ans-1': [{ id: 'ph-1', answer_id: 'ans-1', storage_path: 'u/insp-1/a.jpg', caption: null, latitude: null, longitude: null, address: null, created_at: 'c' }],
    });
    answersApi.upsert.mockResolvedValue({ id: 'ans-new' });
    storageApi.copy.mockImplementation(async (_b: string, _from: string, to: string) => to);
    inspectionAttachmentsApi.listByInspection.mockResolvedValue([
      { id: 'att-1', inspection_id: 'insp-1', user_id: 'u', cert_type: 'ISO', cert_number: '5', photo_path: 'u/insp-1/cert.jpg', created_at: 'c', updated_at: 'c' },
    ]);

    const res = await duplicateDocument({ kind: 'genericInspection', id: 'insp-1' }, qc);

    expect(res.id).toBe('dup-1');
    // new draft created from the source setup
    expect(inspectionsApi.create).toHaveBeenCalledWith({
      projectId: 'p4', templateId: 't1', harnessName: 'Harness #2', projectItemId: null,
    });
    const updatePatch = inspectionsApi.update.mock.calls[0][0];
    expect(updatePatch.status).toBe('draft');
    // conclusion photo blob copied (answer-photos bucket) → independent new path
    expect(storageApi.copy).toHaveBeenCalledWith('answer-photos', 'u/insp-1/concl.jpg', expect.any(String));
    expect(updatePatch.conclusion_photo_paths[0]).not.toBe('u/insp-1/concl.jpg');
    // answer cloned onto the new inspection
    expect(answersApi.upsert.mock.calls[0][0].inspection_id).toBe('dup-1');
    // answer photo blob copied (answer-photos bucket) → addPhoto with the NEW path
    expect(storageApi.copy).toHaveBeenCalledWith('answer-photos', 'u/insp-1/a.jpg', expect.any(String));
    const addPhotoPath = answersApi.addPhoto.mock.calls[0][1];
    expect(addPhotoPath).not.toBe('u/insp-1/a.jpg');
    // attachment cloned with a copied cert photo blob (certificates bucket)
    expect(storageApi.copy).toHaveBeenCalledWith('certificates', 'u/insp-1/cert.jpg', expect.any(String));
    const attArg = inspectionAttachmentsApi.create.mock.calls[0][0];
    expect(attArg.inspectionId).toBe('dup-1');
    expect(attArg.certType).toBe('ISO');
    expect(invalidateRecordLists).toHaveBeenCalled();
  });
});
