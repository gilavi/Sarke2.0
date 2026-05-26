import { describe, it, expect, vi, beforeEach } from 'vitest';

const manipulateAsync = vi.fn();
const getInfoAsync = vi.fn();
const deleteAsync = vi.fn(async (..._args: any[]) => undefined);
const makeDirectoryAsync = vi.fn(async (..._args: any[]) => undefined);
const copyAsync = vi.fn(async (..._args: any[]) => undefined);

vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: any[]) => manipulateAsync(...args),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

vi.mock('expo-file-system/legacy', () => ({
  getInfoAsync: (...args: any[]) => getInfoAsync(...args),
  deleteAsync: (...args: any[]) => deleteAsync(...args),
  makeDirectoryAsync: (...args: any[]) => makeDirectoryAsync(...args),
  copyAsync: (...args: any[]) => copyAsync(...args),
  cacheDirectory: '/cache/',
  documentDirectory: '/docs/',
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
}));

const { compressPhoto, compressPhotoForUpload, stageCompressedPhotoForOffline } =
  await import('../../lib/photoCompression');

beforeEach(() => {
  manipulateAsync.mockReset();
  getInfoAsync.mockReset();
  deleteAsync.mockClear();
  makeDirectoryAsync.mockClear();
  copyAsync.mockClear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('compressPhoto', () => {
  it('applies the default profile when no options passed (resize to 1600)', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'out.jpg', width: 1600, height: 1200 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 200_000 });
    const r = await compressPhoto('source.jpg');
    expect(r.uri).toBe('out.jpg');
    expect(r.width).toBe(1600);
    expect(r.height).toBe(1200);
    expect(r.sizeBytes).toBe(200_000);
    expect(manipulateAsync.mock.calls[0]![1]).toEqual([{ resize: { width: 1600 } }]);
    expect(manipulateAsync.mock.calls[0]![2]).toMatchObject({ compress: 0.75, format: 'jpeg' });
  });

  it('uses inspection profile settings when profile=inspection', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'out.jpg', width: 1600, height: 1200 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 200_000 });
    await compressPhoto('s.jpg', { profile: 'inspection' });
    expect(manipulateAsync.mock.calls[0]![2]).toMatchObject({ compress: 0.75 });
  });

  it('uses logo profile (512px / quality 0.85)', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'out.jpg', width: 512, height: 512 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 50_000 });
    await compressPhoto('s.jpg', { profile: 'logo' });
    expect(manipulateAsync.mock.calls[0]![1]).toEqual([{ resize: { width: 512 } }]);
    expect(manipulateAsync.mock.calls[0]![2]).toMatchObject({ compress: 0.85 });
  });

  it('skips resize for document profile (maxWidth >= 9000)', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'out.jpg', width: 4000, height: 3000 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 800_000 });
    await compressPhoto('s.jpg', { profile: 'document' });
    expect(manipulateAsync.mock.calls[0]![1]).toEqual([]);
  });

  it('uses PNG format when preserveFormat=true', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'out.png', width: 800, height: 600 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 100_000 });
    await compressPhoto('s.jpg', { preserveFormat: true });
    expect(manipulateAsync.mock.calls[0]![2]).toMatchObject({ format: 'png' });
  });

  it('honors overrides for maxWidth and quality', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'out.jpg', width: 300, height: 200 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 50_000 });
    await compressPhoto('s.jpg', { maxWidth: 300, quality: 0.5 });
    expect(manipulateAsync.mock.calls[0]![1]).toEqual([{ resize: { width: 300 } }]);
    expect(manipulateAsync.mock.calls[0]![2]).toMatchObject({ compress: 0.5 });
  });

  it('runs an adaptive second pass when output exceeds maxBytes', async () => {
    manipulateAsync
      .mockResolvedValueOnce({ uri: 'out1.jpg', width: 1600, height: 1200 })
      .mockResolvedValueOnce({ uri: 'out2.jpg', width: 1600, height: 1200 });
    getInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 2_000_000 }) // source (unused for branch but called)
      .mockResolvedValueOnce({ exists: true, size: 800_000 })   // first pass (over)
      .mockResolvedValueOnce({ exists: true, size: 300_000 });  // second pass
    const r = await compressPhoto('s.jpg', { profile: 'inspection' });
    expect(manipulateAsync).toHaveBeenCalledTimes(2);
    expect(r.uri).toBe('out2.jpg');
    expect(r.sizeBytes).toBe(300_000);
    expect(manipulateAsync.mock.calls[1]![2]!.compress).toBeCloseTo(0.525, 3);
  });

  it('does not run second pass when first pass already small enough', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'out.jpg', width: 1600, height: 1200 });
    getInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 2_000_000 })
      .mockResolvedValueOnce({ exists: true, size: 100_000 });
    await compressPhoto('s.jpg', { profile: 'inspection' });
    expect(manipulateAsync).toHaveBeenCalledTimes(1);
  });

  it('handles missing source size info gracefully (defaults to 0)', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'out.jpg', width: 800, height: 600 });
    getInfoAsync.mockResolvedValue({ exists: false });
    const r = await compressPhoto('s.jpg');
    expect(r.sizeBytes).toBe(0);
  });
});

describe('compressPhotoForUpload', () => {
  it('calls uploadFn with the compressed uri and returns its result', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'compressed.jpg', width: 100, height: 100 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 50_000 });
    const upload = vi.fn(async (uri: string) => `uploaded:${uri}`);
    const result = await compressPhotoForUpload('source.jpg', { uploadFn: upload });
    expect(upload).toHaveBeenCalledWith('compressed.jpg');
    expect(result).toBe('uploaded:compressed.jpg');
  });

  it('cleans up the compressed file after upload', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'compressed.jpg', width: 100, height: 100 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 50_000 });
    await compressPhotoForUpload('source.jpg', { uploadFn: async () => 'ok' });
    expect(deleteAsync).toHaveBeenCalledWith('compressed.jpg', { idempotent: true });
  });

  it('falls back to uploading the original source if compression throws', async () => {
    manipulateAsync.mockRejectedValue(new Error('compression fail'));
    const upload = vi.fn(async (uri: string) => `uploaded:${uri}`);
    const result = await compressPhotoForUpload('source.jpg', { uploadFn: upload });
    expect(upload).toHaveBeenCalledWith('source.jpg');
    expect(result).toBe('uploaded:source.jpg');
  });

  it('also cleans up when uploadFn throws', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'compressed.jpg', width: 100, height: 100 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 50_000 });
    await expect(
      compressPhotoForUpload('source.jpg', {
        uploadFn: async () => {
          throw new Error('upload fail');
        },
      }),
    ).rejects.toThrow('upload fail');
    expect(deleteAsync).toHaveBeenCalledWith('compressed.jpg', { idempotent: true });
  });
});

describe('stageCompressedPhotoForOffline', () => {
  it('compresses + copies into the offline-uploads directory', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'compressed.jpg', width: 100, height: 100 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 50_000 });
    const stagedUri = await stageCompressedPhotoForOffline('source.jpg', 'inspection');
    expect(makeDirectoryAsync).toHaveBeenCalledWith('/docs/offline-uploads/', { intermediates: true });
    expect(copyAsync).toHaveBeenCalled();
    expect(stagedUri.startsWith('/docs/offline-uploads/offline_')).toBe(true);
    expect(stagedUri.endsWith('.jpg')).toBe(true);
  });

  it('stages the original source if compression fails', async () => {
    manipulateAsync.mockRejectedValue(new Error('compression fail'));
    const stagedUri = await stageCompressedPhotoForOffline('source.jpg', 'inspection');
    expect(copyAsync.mock.calls[0]![0]).toEqual({ from: 'source.jpg', to: stagedUri });
  });

  it('cleans up the intermediate compressed file after staging', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'compressed.jpg', width: 100, height: 100 });
    getInfoAsync.mockResolvedValue({ exists: true, size: 50_000 });
    await stageCompressedPhotoForOffline('source.jpg', 'inspection');
    expect(deleteAsync).toHaveBeenCalledWith('compressed.jpg', { idempotent: true });
  });
});
