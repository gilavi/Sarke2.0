import { describe, it, expect, vi, beforeEach } from 'vitest';

const writeAsStringAsync = vi.fn(async (..._args: any[]) => undefined);

vi.mock('expo-file-system/legacy', () => ({
  writeAsStringAsync: (...args: any[]) => writeAsStringAsync(...args),
  cacheDirectory: '/cache/',
  documentDirectory: '/docs/',
  EncodingType: { Base64: 'base64' },
}));

const { blobToDataUrl, dataUrlToArrayBuffer, dataUrlToTempFile } =
  await import('../../lib/blob');

beforeEach(() => {
  writeAsStringAsync.mockClear();
});

// ── blobToDataUrl ─────────────────────────────────────────────────────────────

describe('blobToDataUrl', () => {
  it('uses the arrayBuffer path when available', async () => {
    const bytes = new Uint8Array([72, 105]); // "Hi"
    const blob = {
      type: 'image/png',
      arrayBuffer: async () => bytes.buffer,
    } as any;
    const dataUrl = await blobToDataUrl(blob);
    expect(dataUrl).toBe(`data:image/png;base64,SGk=`);
  });

  it('defaults mime to image/jpeg when blob.type is empty', async () => {
    const bytes = new Uint8Array([65]); // "A"
    const blob = {
      type: '',
      arrayBuffer: async () => bytes.buffer,
    } as any;
    const dataUrl = await blobToDataUrl(blob);
    expect(dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('falls back to FileReader when arrayBuffer is absent', async () => {
    const blob = { type: 'image/png' } as any;
    const longPayload = 'A'.repeat(40); // > MIN_DATA_URL_PAYLOAD (32)
    const fakeDataUrl = `data:image/png;base64,${longPayload}`;
    const fakeReader = {
      onloadend: null as null | (() => void),
      onerror: null as null | (() => void),
      result: fakeDataUrl as string | null,
      error: null as Error | null,
      readAsDataURL: vi.fn(function (this: any) {
        setTimeout(() => this.onloadend?.(), 0);
      }),
    };
    (globalThis as any).FileReader = vi.fn(function (this: any) {
      Object.assign(this, fakeReader);
      this.readAsDataURL = fakeReader.readAsDataURL.bind(this);
    });
    const dataUrl = await blobToDataUrl(blob);
    expect(dataUrl).toBe(fakeDataUrl);
  });

  it('FileReader path rejects empty payload', async () => {
    const blob = { type: 'image/png' } as any;
    const tooShortDataUrl = 'data:image/png;base64,A'; // 1 char after comma
    const fakeReader = {
      onloadend: null as null | (() => void),
      onerror: null as null | (() => void),
      result: tooShortDataUrl as string | null,
      error: null as Error | null,
      readAsDataURL: vi.fn(function (this: any) {
        setTimeout(() => this.onloadend?.(), 0);
      }),
    };
    (globalThis as any).FileReader = vi.fn(function (this: any) {
      Object.assign(this, fakeReader);
      this.readAsDataURL = fakeReader.readAsDataURL.bind(this);
    });
    await expect(blobToDataUrl(blob)).rejects.toThrow('empty data URL');
  });

  it('FileReader path rejects when result is not a data: URL', async () => {
    const blob = { type: 'image/png' } as any;
    const fakeReader = {
      onloadend: null as null | (() => void),
      onerror: null as null | (() => void),
      result: 'garbage' as string | null,
      error: null as Error | null,
      readAsDataURL: vi.fn(function (this: any) {
        setTimeout(() => this.onloadend?.(), 0);
      }),
    };
    (globalThis as any).FileReader = vi.fn(function (this: any) {
      Object.assign(this, fakeReader);
      this.readAsDataURL = fakeReader.readAsDataURL.bind(this);
    });
    await expect(blobToDataUrl(blob)).rejects.toThrow('no data URL');
  });
});

// ── dataUrlToArrayBuffer ──────────────────────────────────────────────────────

describe('dataUrlToArrayBuffer', () => {
  it('decodes a valid base64 data URL', () => {
    const ab = dataUrlToArrayBuffer('data:text/plain;base64,SGk=');
    const bytes = new Uint8Array(ab);
    expect(Array.from(bytes)).toEqual([72, 105]); // "Hi"
  });

  it('decodes empty payload to a 0-byte buffer', () => {
    const ab = dataUrlToArrayBuffer('data:text/plain;base64,');
    expect(ab.byteLength).toBe(0);
  });

  it('throws when input is not a data URL (no comma)', () => {
    expect(() => dataUrlToArrayBuffer('plain string')).toThrow('not a data URL');
  });
});

// ── dataUrlToTempFile ─────────────────────────────────────────────────────────

describe('dataUrlToTempFile', () => {
  it('writes the decoded base64 to a cache file and returns the URI', async () => {
    const uri = await dataUrlToTempFile('data:image/png;base64,SGk=', 'png');
    expect(uri.startsWith('/cache/upload-')).toBe(true);
    expect(uri.endsWith('.png')).toBe(true);
    expect(writeAsStringAsync).toHaveBeenCalledWith(uri, 'SGk=', { encoding: 'base64' });
  });

  it('defaults ext to png when not provided', async () => {
    const uri = await dataUrlToTempFile('data:image/png;base64,SGk=');
    expect(uri.endsWith('.png')).toBe(true);
  });

  it('throws when not a data URL', async () => {
    await expect(dataUrlToTempFile('plain')).rejects.toThrow('not a data URL');
  });

  it('throws when payload is empty', async () => {
    await expect(dataUrlToTempFile('data:image/png;base64,')).rejects.toThrow('empty payload');
  });
});
