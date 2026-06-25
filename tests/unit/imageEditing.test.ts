/**
 * Unit tests for the in-app image-edit primitives (`lib/imageEditing.ts`).
 *
 * These wrap expo-image-manipulator's legacy `manipulateAsync` so the photo
 * editor never reaches for the manipulator API directly. The tests lock:
 *  - the exact action shapes (crop rect / rotate degrees / no-op normalize),
 *  - that the post-transform dimensions are returned (rotate swaps them),
 *  - the `normalizeImage` best-effort fallback to the original URI on failure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const manipulateAsync = vi.fn();

vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: any[]) => manipulateAsync(...args),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

const { cropImage, rotateImage, normalizeImage } = await import('../../lib/imageEditing');

beforeEach(() => {
  manipulateAsync.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('cropImage', () => {
  it('passes the source-pixel rect as a crop action and returns the result dims', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'cropped.jpg', width: 400, height: 200 });
    const rect = { originX: 40, originY: 80, width: 400, height: 200 };

    const r = await cropImage('source.jpg', rect);

    expect(r).toEqual({ uri: 'cropped.jpg', width: 400, height: 200 });
    expect(manipulateAsync.mock.calls[0]![0]).toBe('source.jpg');
    expect(manipulateAsync.mock.calls[0]![1]).toEqual([{ crop: rect }]);
    // Max quality — upload-time compression happens later.
    expect(manipulateAsync.mock.calls[0]![2]).toMatchObject({ compress: 1, format: 'jpeg' });
  });
});

describe('rotateImage', () => {
  it('passes the rotate degrees and returns the (swapped) result dims', async () => {
    // 90° turns a landscape source into a portrait result — trust the returned dims.
    manipulateAsync.mockResolvedValue({ uri: 'rotated.jpg', width: 800, height: 1200 });

    const r = await rotateImage('source.jpg', 90);

    expect(r).toEqual({ uri: 'rotated.jpg', width: 800, height: 1200 });
    expect(manipulateAsync.mock.calls[0]![1]).toEqual([{ rotate: 90 }]);
    expect(manipulateAsync.mock.calls[0]![2]).toMatchObject({ compress: 1, format: 'jpeg' });
  });
});

describe('normalizeImage', () => {
  it('runs a no-op manipulate pass (bakes EXIF / materializes remote) and returns dims', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'local-normalized.jpg', width: 1200, height: 900 });

    const r = await normalizeImage('https://signed.example/photo.jpg');

    expect(r).toEqual({ uri: 'local-normalized.jpg', width: 1200, height: 900 });
    // No transform actions — just a re-encode.
    expect(manipulateAsync.mock.calls[0]![1]).toEqual([]);
    expect(manipulateAsync.mock.calls[0]![2]).toMatchObject({ compress: 1, format: 'jpeg' });
  });

  it('falls back to the original uri (0 dims) when the manipulate pass throws', async () => {
    manipulateAsync.mockRejectedValue(new Error('offline'));

    const r = await normalizeImage('https://signed.example/photo.jpg');

    expect(r).toEqual({ uri: 'https://signed.example/photo.jpg', width: 0, height: 0 });
  });
});
