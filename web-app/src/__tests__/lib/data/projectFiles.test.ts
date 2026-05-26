import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/lib/db/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/storage')>();
  return { ...actual, signedUrl: vi.fn(), upload: vi.fn(), removeObjects: vi.fn() };
});

import { supabase } from '@/lib/supabase';
import { signedUrl, upload, removeObjects, STORAGE_BUCKETS } from '@/lib/db/storage';
import {
  listProjectFiles,
  signedFileUrl,
  uploadProjectFile,
  deleteProjectFile,
  formatSize,
  type ProjectFile,
} from '@/lib/data/projectFiles';
import { makeBuilder } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;

const file = (over: Partial<ProjectFile> = {}): ProjectFile => ({
  id: 'f1',
  project_id: 'p1',
  name: 'doc.pdf',
  storage_path: 'u1/p1/doc.pdf',
  size_bytes: 1234,
  mime_type: 'application/pdf',
  created_at: '2026-05-01T00:00:00Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(upload).mockImplementation(async (_b, path) => path);
});
afterEach(() => vi.restoreAllMocks());

describe('listProjectFiles', () => {
  it('filters by project and orders by created_at desc', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listProjectFiles('p1');
    expect(b.eq).toHaveBeenCalledWith('project_id', 'p1');
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

describe('signedFileUrl', () => {
  it('uses the project-files bucket', () => {
    vi.mocked(signedUrl).mockResolvedValue('u');
    void signedFileUrl('x');
    expect(signedUrl).toHaveBeenCalledWith(STORAGE_BUCKETS.projectFiles, 'x');
  });
});

describe('uploadProjectFile', () => {
  it('uploads under {userId}/{projectId}/{ts}_{name} and inserts metadata', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1717000000000);
    const b = makeBuilder({ data: file({ id: 'new' }), error: null });
    from.mockReturnValue(b);
    const f = new File(['data'], 'report.pdf', { type: 'application/pdf' });

    await uploadProjectFile('p1', 'u1', f);

    const expectedPath = 'u1/p1/1717000000000_report.pdf';
    expect(upload).toHaveBeenCalledWith(STORAGE_BUCKETS.projectFiles, expectedPath, f, { upsert: false });
    expect(b.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'p1',
        name: 'report.pdf',
        storage_path: expectedPath,
        mime_type: 'application/pdf',
      }),
    );
  });
});

describe('deleteProjectFile', () => {
  it('removes the blob then deletes the row', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await deleteProjectFile(file());
    expect(removeObjects).toHaveBeenCalledWith(STORAGE_BUCKETS.projectFiles, ['u1/p1/doc.pdf']);
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 'f1');
  });
});

describe('formatSize', () => {
  it('formats bytes / KB / MB and a dash for empty', () => {
    expect(formatSize(null)).toBe('—');
    expect(formatSize(0)).toBe('—');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(2048)).toBe('2.0 KB');
    expect(formatSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
