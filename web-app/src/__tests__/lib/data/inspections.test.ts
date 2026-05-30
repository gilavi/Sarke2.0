import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));
vi.mock('@/lib/db/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/storage')>();
  return { ...actual, signedUrl: vi.fn(), removeObjects: vi.fn() };
});

import { supabase } from '@/lib/supabase';
import { signedUrl, removeObjects, STORAGE_BUCKETS } from '@/lib/db/storage';
import {
  listInspections,
  countInspections,
  getInspection,
  listInspectionPdfs,
  signedPdfUrl,
  createInspection,
  deleteInspection,
  listQuestions,
  listAnswers,
  upsertAnswer,
  listAnswerPhotos,
  listAllAnswerPhotos,
  addAnswerPhoto,
  removeAnswerPhoto,
  updateInspection,
  getSavedSignatureUrl,
} from '@/lib/data/inspections';
import { makeBuilder, authedUser, anonUser } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;
const getUser = supabase.auth.getUser as unknown as Mock;

beforeEach(() => vi.clearAllMocks());

describe('listInspections', () => {
  it('orders by created_at desc, limits 50, no project filter by default', async () => {
    const b = makeBuilder({ data: [{ id: 'i1' }], error: null });
    from.mockReturnValue(b);
    const result = await listInspections();
    expect(result).toEqual([{ id: 'i1', inspector_signature: null, signatories: [] }]);
    expect(from).toHaveBeenCalledWith('inspections');
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(b.limit).toHaveBeenCalledWith(50);
    expect(b.eq).not.toHaveBeenCalled();
  });

  it('filters by project_id when given', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listInspections('p1');
    expect(b.eq).toHaveBeenCalledWith('project_id', 'p1');
  });

  it('returns [] on null data and throws on error', async () => {
    from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    expect(await listInspections()).toEqual([]);
    from.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(listInspections()).rejects.toThrow('boom');
  });
});

describe('countInspections', () => {
  it('returns the exact head count', async () => {
    const b = makeBuilder({ count: 12, error: null });
    from.mockReturnValue(b);
    expect(await countInspections()).toBe(12);
    expect(b.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
  });

  it('returns 0 when count is null', async () => {
    from.mockReturnValue(makeBuilder({ count: null, error: null }));
    expect(await countInspections()).toBe(0);
  });
});

describe('getInspection', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the row via maybeSingle', async () => {
    const b = makeBuilder({ data: { id: 'i1' }, error: null });
    from.mockReturnValue(b);
    expect(await getInspection('i1')).toEqual({ id: 'i1', inspector_signature: null, signatories: [] });
    expect(b.eq).toHaveBeenCalledWith('id', 'i1');
  });

  it('returns null when no row is found', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await getInspection('missing')).toBeNull();
  });

  it('throws on error', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'bad' } }));
    await expect(getInspection('i1')).rejects.toThrow('bad');
  });
});

describe('listInspectionPdfs', () => {
  it('fetches certificates for the inspection ordered by generated_at desc', async () => {
    const b = makeBuilder({ data: [{ id: 'c1', pdf_url: 'u', generated_at: 't' }], error: null });
    from.mockReturnValue(b);
    const result = await listInspectionPdfs('i1');
    expect(from).toHaveBeenCalledWith('certificates');
    expect(b.eq).toHaveBeenCalledWith('inspection_id', 'i1');
    expect(b.order).toHaveBeenCalledWith('generated_at', { ascending: false });
    expect(result).toHaveLength(1);
  });
});

describe('signedPdfUrl', () => {
  it('delegates to signedUrl on the pdfs bucket', () => {
    vi.mocked(signedUrl).mockResolvedValue('https://signed/p');
    void signedPdfUrl('a/b.pdf');
    expect(signedUrl).toHaveBeenCalledWith(STORAGE_BUCKETS.pdfs, 'a/b.pdf');
  });
});

describe('createInspection', () => {
  it('inserts a draft with null-coalesced optionals for the authenticated user', async () => {
    getUser.mockResolvedValue(authedUser('u9'));
    const b = makeBuilder({ data: { id: 'new' }, error: null });
    from.mockReturnValue(b);

    const result = await createInspection({ projectId: 'p1', templateId: 't1' });

    expect(b.insert).toHaveBeenCalledWith({
      project_id: 'p1',
      template_id: 't1',
      user_id: 'u9',
      harness_name: null,
      department: null,
      inspector_name: null,
      status: 'draft',
    });
    expect(result).toEqual({ id: 'new', inspector_signature: null, signatories: [] });
  });

  it('throws არაავტორიზებული when not signed in', async () => {
    getUser.mockResolvedValue(anonUser());
    await expect(createInspection({ projectId: 'p1', templateId: 't1' })).rejects.toThrow('არაავტორიზებული');
  });
});

describe('deleteInspection', () => {
  it('deletes by id and throws on error', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await deleteInspection('i1');
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 'i1');

    from.mockReturnValueOnce(makeBuilder({ error: { message: 'nope' } }));
    await expect(deleteInspection('i1')).rejects.toThrow('nope');
  });
});

describe('listQuestions', () => {
  it('filters by template and sorts by section then order', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listQuestions('t1');
    expect(b.eq).toHaveBeenCalledWith('template_id', 't1');
    expect(b.order).toHaveBeenCalledWith('section', { ascending: true });
    expect(b.order).toHaveBeenCalledWith('"order"', { ascending: true });
  });
});

describe('listAnswers', () => {
  it('fetches answers for the inspection', async () => {
    const b = makeBuilder({ data: [{ id: 'a1' }], error: null });
    from.mockReturnValue(b);
    expect(await listAnswers('i1')).toEqual([{ id: 'a1' }]);
    expect(b.eq).toHaveBeenCalledWith('inspection_id', 'i1');
  });
});

describe('upsertAnswer', () => {
  it('upserts with the composite conflict target and null-coalesced values', async () => {
    const b = makeBuilder({ data: { id: 'a1' }, error: null });
    from.mockReturnValue(b);
    await upsertAnswer({ inspectionId: 'i1', questionId: 'q1', valueBool: true });
    expect(b.upsert).toHaveBeenCalledWith(
      {
        inspection_id: 'i1',
        question_id: 'q1',
        value_bool: true,
        value_num: null,
        value_text: null,
        grid_values: null,
        comment: null,
      },
      { onConflict: 'inspection_id,question_id' },
    );
  });
});

describe('answer photos', () => {
  it('listAnswerPhotos filters by answer_id', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listAnswerPhotos('a1');
    expect(b.eq).toHaveBeenCalledWith('answer_id', 'a1');
  });

  it('listAllAnswerPhotos short-circuits to {} for an empty id list', async () => {
    expect(await listAllAnswerPhotos([])).toEqual({});
    expect(from).not.toHaveBeenCalled();
  });

  it('listAllAnswerPhotos groups rows into an answerId → photos map', async () => {
    const b = makeBuilder({
      data: [
        { id: 'p1', answer_id: 'a' },
        { id: 'p2', answer_id: 'a' },
        { id: 'p3', answer_id: 'b' },
      ],
      error: null,
    });
    from.mockReturnValue(b);
    const result = await listAllAnswerPhotos(['a', 'b']);
    expect(b.in).toHaveBeenCalledWith('answer_id', ['a', 'b']);
    expect(result.a).toHaveLength(2);
    expect(result.b).toHaveLength(1);
  });

  it('addAnswerPhoto inserts the geo fields with null defaults', async () => {
    const b = makeBuilder({ data: { id: 'p1' }, error: null });
    from.mockReturnValue(b);
    await addAnswerPhoto('a1', 'path/x.png', 'cap', { latitude: 41.7, longitude: 44.8, address: 'თბილისი' });
    expect(b.insert).toHaveBeenCalledWith({
      answer_id: 'a1',
      storage_path: 'path/x.png',
      caption: 'cap',
      latitude: 41.7,
      longitude: 44.8,
      address: 'თბილისი',
    });
  });

  it('removeAnswerPhoto deletes the row then best-effort removes the blob', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await removeAnswerPhoto('photo-1', 'path/x.png');
    expect(b.eq).toHaveBeenCalledWith('id', 'photo-1');
    expect(removeObjects).toHaveBeenCalledWith(STORAGE_BUCKETS.answerPhotos, ['path/x.png']);
  });
});

describe('updateInspection', () => {
  it('stamps completed_at when status becomes completed', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await updateInspection('i1', { status: 'completed' });
    expect(b.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', completed_at: expect.any(String) }),
    );
    expect(b.eq).toHaveBeenCalledWith('id', 'i1');
  });

  it('does not stamp completed_at for other patches', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await updateInspection('i1', { department: 'დეპ' });
    const arg = b.update.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).not.toHaveProperty('completed_at');
    expect(arg).toMatchObject({ department: 'დეპ' });
  });
});

describe('getSavedSignatureUrl', () => {
  it('returns null when not authenticated', async () => {
    getUser.mockResolvedValue(anonUser());
    expect(await getSavedSignatureUrl()).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it('reads saved_signature_url for the current user', async () => {
    getUser.mockResolvedValue(authedUser('u1'));
    const b = makeBuilder({ data: { saved_signature_url: 'sig/path.png' }, error: null });
    from.mockReturnValue(b);
    expect(await getSavedSignatureUrl()).toBe('sig/path.png');
    expect(from).toHaveBeenCalledWith('users');
    expect(b.eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('returns null when the user row has no saved signature', async () => {
    getUser.mockResolvedValue(authedUser('u1'));
    from.mockReturnValue(makeBuilder({ data: { saved_signature_url: null }, error: null }));
    expect(await getSavedSignatureUrl()).toBeNull();
  });
});
