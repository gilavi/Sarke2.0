import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

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
  listReports,
  getReport,
  signedReportPdfUrl,
  signedReportPhotoUrl,
  createReport,
  addReportSlide,
  updateReportSlide,
  removeReportSlide,
  deleteReport,
  type Report,
  type ReportSlide,
} from '@/lib/data/reports';
import { makeBuilder, authedUser, anonUser } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;
const getUser = supabase.auth.getUser as unknown as Mock;

const slide = (over: Partial<ReportSlide> = {}): ReportSlide => ({
  id: 's1',
  order: 0,
  title: 'სათაური',
  description: 'აღწერა',
  image_path: null,
  annotated_image_path: null,
  ...over,
});

const report = (over: Partial<Report> = {}): Report => ({
  id: 'r1',
  project_id: 'p1',
  user_id: 'u1',
  title: 'ანგარიში',
  status: 'draft',
  slides: [],
  pdf_url: null,
  created_at: '2026-05-01T00:00:00Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(upload).mockImplementation(async (_b, path) => path);
});

describe('listReports / getReport', () => {
  it('lists ordered by created_at desc with optional project filter', async () => {
    const b = makeBuilder({ data: [report()], error: null });
    from.mockReturnValue(b);
    await listReports('p1');
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(b.eq).toHaveBeenCalledWith('project_id', 'p1');
  });

  it('getReport returns null when missing', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await getReport('nope')).toBeNull();
  });
});

describe('signed url helpers', () => {
  it('use the pdfs and report-photos buckets', () => {
    vi.mocked(signedUrl).mockResolvedValue('u');
    void signedReportPdfUrl('a.pdf');
    void signedReportPhotoUrl('b.jpg');
    expect(signedUrl).toHaveBeenCalledWith(STORAGE_BUCKETS.pdfs, 'a.pdf');
    expect(signedUrl).toHaveBeenCalledWith(STORAGE_BUCKETS.reportPhotos, 'b.jpg');
  });
});

describe('createReport', () => {
  it('inserts an empty-slides draft for the authenticated user', async () => {
    getUser.mockResolvedValue(authedUser('u9'));
    const b = makeBuilder({ data: report({ id: 'new' }), error: null });
    from.mockReturnValue(b);
    await createReport({ projectId: 'p1', title: 'ტესტი' });
    expect(b.insert).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: 'p1', user_id: 'u9', title: 'ტესტი', status: 'draft', slides: [] }),
    );
  });

  it('throws when not signed in', async () => {
    getUser.mockResolvedValue(anonUser());
    await expect(createReport({ projectId: 'p1', title: 't' })).rejects.toThrow('არაავტორიზებული');
  });
});

describe('addReportSlide', () => {
  it('appends a slide with the next order index (no photo)', async () => {
    const b = makeBuilder({ data: report(), error: null });
    from.mockReturnValue(b);
    await addReportSlide({ report: report({ slides: [slide({ id: 'a', order: 0 })] }), title: 'ახალი', description: 'დ' });

    const arg = b.update.mock.calls[0][0] as { slides: ReportSlide[] };
    expect(arg.slides).toHaveLength(2);
    expect(arg.slides[1]).toMatchObject({ title: 'ახალი', description: 'დ', order: 1, image_path: null });
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads the photo to report-photos when provided', async () => {
    const b = makeBuilder({ data: report(), error: null });
    from.mockReturnValue(b);
    const photo = new File(['x'], 'p.png', { type: 'image/png' });
    await addReportSlide({ report: report(), title: 't', description: 'd', photo });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(vi.mocked(upload).mock.calls[0][0]).toBe(STORAGE_BUCKETS.reportPhotos);
    const arg = b.update.mock.calls[0][0] as { slides: ReportSlide[] };
    expect(typeof arg.slides[0].image_path).toBe('string');
  });
});

describe('updateReportSlide', () => {
  it('patches the matching slide by id', async () => {
    const b = makeBuilder({ data: report(), error: null });
    from.mockReturnValue(b);
    const r = report({ slides: [slide({ id: 'a', title: 'ძველი' }), slide({ id: 'b' })] });
    await updateReportSlide(r, 'a', { title: 'ახალი' });
    const arg = b.update.mock.calls[0][0] as { slides: ReportSlide[] };
    expect(arg.slides[0].title).toBe('ახალი');
    expect(arg.slides[1].title).toBe('სათაური');
  });
});

describe('removeReportSlide', () => {
  it('removes the slide blobs, drops it, and reindexes order', async () => {
    const b = makeBuilder({ data: report(), error: null });
    from.mockReturnValue(b);
    const r = report({
      slides: [
        slide({ id: 'a', order: 0, image_path: 'img-a.png', annotated_image_path: 'ann-a.png' }),
        slide({ id: 'b', order: 1 }),
      ],
    });
    await removeReportSlide(r, 'a');
    expect(removeObjects).toHaveBeenCalledWith(STORAGE_BUCKETS.reportPhotos, ['img-a.png', 'ann-a.png']);
    const arg = b.update.mock.calls[0][0] as { slides: ReportSlide[] };
    expect(arg.slides).toHaveLength(1);
    expect(arg.slides[0]).toMatchObject({ id: 'b', order: 0 });
  });
});

describe('deleteReport', () => {
  it('removes all slide blobs then deletes the row', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    const r = report({
      slides: [slide({ id: 'a', image_path: 'i1.png' }), slide({ id: 'b', annotated_image_path: 'a2.png' })],
    });
    await deleteReport(r);
    expect(removeObjects).toHaveBeenCalledWith(STORAGE_BUCKETS.reportPhotos, ['i1.png', 'a2.png']);
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('skips blob removal when there are no slide images', async () => {
    from.mockReturnValue(makeBuilder({ error: null }));
    await deleteReport(report({ slides: [] }));
    expect(removeObjects).not.toHaveBeenCalled();
  });
});
