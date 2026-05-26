import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: vi.fn() } },
}));

import { supabase } from '@/lib/supabase';
import {
  STORAGE_BUCKETS,
  SIGNED_URL_TTL_SECONDS,
  signedUrl,
  upload,
  removeObjects,
} from '@/lib/db/storage';

const storageFrom = supabase.storage.from as unknown as Mock;

function bucketMock(over: {
  createSignedUrl?: unknown;
  upload?: unknown;
  remove?: unknown;
} = {}) {
  const bucket = {
    createSignedUrl: vi.fn().mockResolvedValue(over.createSignedUrl ?? { data: { signedUrl: 'https://signed/x' }, error: null }),
    upload: vi.fn().mockResolvedValue(over.upload ?? { data: { path: 'p' }, error: null }),
    remove: vi.fn().mockResolvedValue(over.remove ?? { data: [], error: null }),
  };
  storageFrom.mockReturnValue(bucket);
  return bucket;
}

beforeEach(() => vi.clearAllMocks());

describe('STORAGE_BUCKETS', () => {
  it('exposes the 8 fixed bucket names shared with the mobile app', () => {
    expect(STORAGE_BUCKETS).toEqual({
      certificates: 'certificates',
      answerPhotos: 'answer-photos',
      pdfs: 'pdfs',
      signatures: 'signatures',
      incidentPhotos: 'incident-photos',
      reportPhotos: 'report-photos',
      projectFiles: 'project-files',
      remoteSignatures: 'remote-signatures',
    });
  });

  it('defaults the signed-URL TTL to 10 minutes', () => {
    expect(SIGNED_URL_TTL_SECONDS).toBe(600);
  });
});

describe('signedUrl', () => {
  it('returns the signed URL using the default 600s TTL', async () => {
    const bucket = bucketMock({ createSignedUrl: { data: { signedUrl: 'https://signed/abc' }, error: null } });
    const url = await signedUrl(STORAGE_BUCKETS.pdfs, 'a/b.pdf');
    expect(url).toBe('https://signed/abc');
    expect(storageFrom).toHaveBeenCalledWith('pdfs');
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('a/b.pdf', 600);
  });

  it('passes a custom TTL through', async () => {
    const bucket = bucketMock();
    await signedUrl(STORAGE_BUCKETS.certificates, 'c.pdf', 42);
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('c.pdf', 42);
  });

  it('throws the Supabase error message', async () => {
    bucketMock({ createSignedUrl: { data: null, error: { message: 'nope' } } });
    await expect(signedUrl(STORAGE_BUCKETS.pdfs, 'x')).rejects.toThrow('nope');
  });
});

describe('upload', () => {
  it('derives contentType from a File and defaults upsert to false', async () => {
    const bucket = bucketMock();
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    const path = await upload(STORAGE_BUCKETS.answerPhotos, 'dir/photo.png', file);
    expect(path).toBe('dir/photo.png');
    expect(bucket.upload).toHaveBeenCalledWith('dir/photo.png', file, {
      upsert: false,
      contentType: 'image/png',
    });
  });

  it('lets an explicit contentType win and honors upsert', async () => {
    const bucket = bucketMock();
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    await upload(STORAGE_BUCKETS.answerPhotos, 'p', file, { contentType: 'application/pdf', upsert: true });
    expect(bucket.upload).toHaveBeenCalledWith('p', file, { upsert: true, contentType: 'application/pdf' });
  });

  it('omits contentType for a typeless Blob', async () => {
    const bucket = bucketMock();
    const blob = new Blob(['data']);
    await upload(STORAGE_BUCKETS.pdfs, 'p', blob);
    expect(bucket.upload).toHaveBeenCalledWith('p', blob, { upsert: false });
  });

  it('throws the Supabase error message', async () => {
    bucketMock({ upload: { data: null, error: { message: 'upload failed' } } });
    await expect(upload(STORAGE_BUCKETS.pdfs, 'p', new Blob(['x']))).rejects.toThrow('upload failed');
  });
});

describe('removeObjects', () => {
  it('does nothing (no Supabase call) for an empty path list', async () => {
    const bucket = bucketMock();
    await removeObjects(STORAGE_BUCKETS.pdfs, []);
    expect(bucket.remove).not.toHaveBeenCalled();
  });

  it('removes the given paths', async () => {
    const bucket = bucketMock();
    await removeObjects(STORAGE_BUCKETS.answerPhotos, ['a', 'b']);
    expect(bucket.remove).toHaveBeenCalledWith(['a', 'b']);
  });

  it('swallows errors by default (best-effort)', async () => {
    bucketMock({ remove: { data: null, error: { message: 'gone' } } });
    await expect(removeObjects(STORAGE_BUCKETS.pdfs, ['a'])).resolves.toBeUndefined();
  });

  it('throws when throwOnError is set', async () => {
    bucketMock({ remove: { data: null, error: { message: 'gone' } } });
    await expect(removeObjects(STORAGE_BUCKETS.pdfs, ['a'], { throwOnError: true })).rejects.toThrow('gone');
  });
});
