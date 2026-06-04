import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));
vi.mock('@/lib/db/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/storage')>();
  return { ...actual, signedUrl: vi.fn(), upload: vi.fn(), removeObjects: vi.fn() };
});

import { supabase } from '@/lib/supabase';
import { signedUrl, upload, removeObjects, STORAGE_BUCKETS } from '@/lib/db/storage';
import {
  INCIDENT_TYPE_LABEL,
  listIncidents,
  getIncident,
  signedIncidentPdfUrl,
  signedIncidentPhotoUrl,
  addIncidentPhoto,
  removeIncidentPhoto,
  updateIncident,
  deleteIncident,
  createIncident,
  type Incident,
} from '@/lib/data/incidents';
import { makeBuilder, authedUser as _authedUser, anonUser as _anonUser } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;
const _getUser = supabase.auth.getUser as unknown as Mock;

const incident = (over: Partial<Incident> = {}): Incident => ({
  id: 'inc1',
  project_id: 'p1',
  type: 'minor',
  injured_name: null,
  injured_role: null,
  date_time: '2026-05-01T10:00:00Z',
  location: 'საamშენებლო',
  description: 'აღწერა',
  cause: 'მიზეzი',
  actions_taken: 'ქმედება',
  witnesses: [],
  photos: [],
  status: 'draft',
  pdf_url: null,
  inspector_signature: null,
  created_at: '2026-05-01T10:00:00Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(upload).mockImplementation(async (_b, path) => path);
});

describe('INCIDENT_TYPE_LABEL', () => {
  it('labels all five incident types in Georgian', () => {
    expect(Object.keys(INCIDENT_TYPE_LABEL)).toEqual(['minor', 'severe', 'fatal', 'mass', 'nearmiss']);
    expect(INCIDENT_TYPE_LABEL.fatal).toBe('ფატალური');
  });
});

describe('listIncidents', () => {
  it('orders by date_time desc, limits 50, optional project filter', async () => {
    const b = makeBuilder({ data: [{ id: 'inc1' }], error: null });
    from.mockReturnValue(b);
    await listIncidents('p1');
    expect(from).toHaveBeenCalledWith('incidents');
    expect(b.order).toHaveBeenCalledWith('date_time', { ascending: false });
    expect(b.limit).toHaveBeenCalledWith(50);
    expect(b.eq).toHaveBeenCalledWith('project_id', 'p1');
  });

  it('throws on error', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(listIncidents()).rejects.toThrow('boom');
  });
});

describe('getIncident', () => {
  it('returns the row or null', async () => {
    from.mockReturnValueOnce(makeBuilder({ data: { id: 'inc1' }, error: null }));
    expect((await getIncident('inc1'))?.id).toBe('inc1');
    from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    expect(await getIncident('nope')).toBeNull();
  });
});

describe('signed url helpers', () => {
  it('use the pdfs and incident-photos buckets', () => {
    vi.mocked(signedUrl).mockResolvedValue('u');
    void signedIncidentPdfUrl('a.pdf');
    void signedIncidentPhotoUrl('b.jpg');
    expect(signedUrl).toHaveBeenCalledWith(STORAGE_BUCKETS.pdfs, 'a.pdf');
    expect(signedUrl).toHaveBeenCalledWith(STORAGE_BUCKETS.incidentPhotos, 'b.jpg');
  });
});

describe('addIncidentPhoto', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uploads to incident-photos and appends the path to the row', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1717000000000);
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    const path = await addIncidentPhoto(incident({ photos: ['old.png'] }), file);

    expect(path).toBe('p1/inc1_1717000000000.png');
    expect(upload).toHaveBeenCalledWith(STORAGE_BUCKETS.incidentPhotos, 'p1/inc1_1717000000000.png', file, {
      contentType: 'image/png',
    });
    expect(b.update).toHaveBeenCalledWith({ photos: ['old.png', 'p1/inc1_1717000000000.png'] });
    expect(b.eq).toHaveBeenCalledWith('id', 'inc1');
  });

  it('rolls back the uploaded blob when the row update fails', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1717000000000);
    from.mockReturnValue(makeBuilder({ error: { message: 'rls' } }));
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await expect(addIncidentPhoto(incident(), file)).rejects.toThrow('rls');
    expect(removeObjects).toHaveBeenCalledWith(STORAGE_BUCKETS.incidentPhotos, [
      'p1/inc1_1717000000000.png',
    ]);
  });
});

describe('removeIncidentPhoto', () => {
  it('drops the path from the row then best-effort removes the blob', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await removeIncidentPhoto(incident({ photos: ['keep.png', 'drop.png'] }), 'drop.png');
    expect(b.update).toHaveBeenCalledWith({ photos: ['keep.png'] });
    expect(removeObjects).toHaveBeenCalledWith(STORAGE_BUCKETS.incidentPhotos, ['drop.png']);
  });
});

describe('updateIncident', () => {
  it('applies the patch scoped by id', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await updateIncident('inc1', { description: 'ახალი' });
    expect(b.update).toHaveBeenCalledWith({ description: 'ახალი' });
    expect(b.eq).toHaveBeenCalledWith('id', 'inc1');
  });
});

describe('deleteIncident', () => {
  it('removes photo blobs when present then deletes the row', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await deleteIncident(incident({ photos: ['a.png', 'b.png'] }));
    expect(removeObjects).toHaveBeenCalledWith(STORAGE_BUCKETS.incidentPhotos, ['a.png', 'b.png']);
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 'inc1');
  });

  it('skips blob removal when there are no photos', async () => {
    from.mockReturnValue(makeBuilder({ error: null }));
    await deleteIncident(incident({ photos: [] }));
    expect(removeObjects).not.toHaveBeenCalled();
  });
});

describe('createIncident', () => {
  it('inserts a draft with null-coalesced optionals and empty photos', async () => {
    const b = makeBuilder({ data: { id: 'new' }, error: null });
    from.mockReturnValue(b);
    await createIncident({
      projectId: 'p1',
      type: 'severe',
      dateTime: '2026-05-01T10:00:00Z',
      description: 'd',
      cause: 'c',
      actionsTaken: 'a',
      witnesses: ['w1'],
    });
    expect(b.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'p1',
        type: 'severe',
        actions_taken: 'a',
        witnesses: ['w1'],
        injured_name: null,
        injured_role: null,
        location: null,
        photos: [],
        status: 'draft',
      }),
    );
  });

  it('uploads attachments and records their paths', async () => {
    const b = makeBuilder({ data: { id: 'new' }, error: null });
    from.mockReturnValue(b);
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await createIncident({
      projectId: 'p1',
      type: 'minor',
      dateTime: 't',
      description: 'd',
      cause: 'c',
      actionsTaken: 'a',
      witnesses: [],
      attachments: [file],
    });
    expect(upload).toHaveBeenCalledTimes(1);
    const insertArg = b.insert.mock.calls[0][0] as { photos: string[] };
    expect(insertArg.photos).toHaveLength(1);
  });

  it('rolls back uploaded attachments when the insert fails', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'rls' } }));
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await expect(
      createIncident({
        projectId: 'p1',
        type: 'minor',
        dateTime: 't',
        description: 'd',
        cause: 'c',
        actionsTaken: 'a',
        witnesses: [],
        attachments: [file],
      }),
    ).rejects.toThrow('rls');
    expect(removeObjects).toHaveBeenCalledTimes(1);
    expect(vi.mocked(removeObjects).mock.calls[0][0]).toBe(STORAGE_BUCKETS.incidentPhotos);
    expect((vi.mocked(removeObjects).mock.calls[0][1] as string[])).toHaveLength(1);
  });
});
