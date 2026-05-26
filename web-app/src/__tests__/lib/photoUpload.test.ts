import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/storage')>();
  return { ...actual, signedUrl: vi.fn(), upload: vi.fn(), removeObjects: vi.fn() };
});

import { signedUrl, upload, removeObjects, STORAGE_BUCKETS } from '@/lib/db/storage';
import {
  uploadInspectionPhoto,
  signedInspectionPhotoUrl,
  deleteInspectionPhoto,
} from '@/lib/photoUpload';

beforeEach(() => {
  vi.clearAllMocks();
  // upload() returns the stored path it was given.
  vi.mocked(upload).mockImplementation(async (_bucket, path) => path);
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(
    '11111111-1111-1111-1111-111111111111' as ReturnType<typeof crypto.randomUUID>,
  );
});

describe('uploadInspectionPhoto', () => {
  it('builds the {prefix}/{inspectionId}/{itemId}/{uuid}.{ext} path and uploads to answer-photos', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const path = await uploadInspectionPhoto('bobcat', 'insp-1', 7, file);

    expect(path).toBe('bobcat/insp-1/7/11111111-1111-1111-1111-111111111111.png');
    expect(upload).toHaveBeenCalledWith(
      STORAGE_BUCKETS.answerPhotos,
      'bobcat/insp-1/7/11111111-1111-1111-1111-111111111111.png',
      file,
      { contentType: 'image/png', upsert: false },
    );
  });

  it('falls back to a jpg extension when the filename has no dot', async () => {
    const file = new File(['x'], 'noext', { type: 'image/jpeg' });
    const path = await uploadInspectionPhoto('excavator', 'i2', 'item-a', file);
    expect(path).toBe('excavator/i2/item-a/11111111-1111-1111-1111-111111111111.jpg');
  });

  it('does not treat a leading dot as an extension boundary', async () => {
    const file = new File(['x'], '.hidden', { type: 'image/jpeg' });
    const path = await uploadInspectionPhoto('excavator', 'i2', 'item-a', file);
    expect(path).toBe('excavator/i2/item-a/11111111-1111-1111-1111-111111111111.jpg');
  });

  it('falls back to image/jpeg content type when the File has no type', async () => {
    const file = new File(['x'], 'p.jpg', { type: '' });
    await uploadInspectionPhoto('general', 'i3', 1, file);
    expect(upload).toHaveBeenCalledWith(
      STORAGE_BUCKETS.answerPhotos,
      expect.any(String),
      file,
      { contentType: 'image/jpeg', upsert: false },
    );
  });
});

describe('signedInspectionPhotoUrl', () => {
  it('delegates to signedUrl on the answer-photos bucket', () => {
    vi.mocked(signedUrl).mockResolvedValue('https://signed/p');
    void signedInspectionPhotoUrl('a/b.png');
    expect(signedUrl).toHaveBeenCalledWith(STORAGE_BUCKETS.answerPhotos, 'a/b.png');
  });
});

describe('deleteInspectionPhoto', () => {
  it('best-effort removes the path from the answer-photos bucket', async () => {
    await deleteInspectionPhoto('a/b.png');
    expect(removeObjects).toHaveBeenCalledWith(STORAGE_BUCKETS.answerPhotos, ['a/b.png']);
  });
});
