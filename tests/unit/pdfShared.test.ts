import { describe, it, expect, vi, beforeEach } from 'vitest';

const pdfPhotoEmbed = vi.fn();

vi.mock('../../lib/supabase', () => ({
  STORAGE_BUCKETS: { answerPhotos: 'answer-photos' },
}));

vi.mock('../../lib/imageUrl', () => ({
  pdfPhotoEmbed: (...args: any[]) => pdfPhotoEmbed(...args),
}));

const { fmtDate, escHtml, embedInspectionPhotos } = await import('../../lib/pdfShared');

beforeEach(() => {
  pdfPhotoEmbed.mockReset();
});

describe('pdfShared', () => {
  describe('fmtDate', () => {
    it('returns em-dash for null/undefined', () => {
      expect(fmtDate(null)).toBe('—');
      expect(fmtDate(undefined)).toBe('—');
    });

    it('returns the original string for invalid dates', () => {
      expect(fmtDate('not-a-date')).toBe('not-a-date');
    });

    it('returns a Georgian-locale formatted date for valid ISO dates', () => {
      const result = fmtDate('2026-05-06T00:00:00Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/2026/);
    });
  });

  describe('escHtml', () => {
    it('returns empty string for null/undefined', () => {
      expect(escHtml(null)).toBe('');
      expect(escHtml(undefined)).toBe('');
    });

    it('escapes &, <, >, "', () => {
      expect(escHtml('a & b')).toBe('a &amp; b');
      expect(escHtml('<div>')).toBe('&lt;div&gt;');
      expect(escHtml('say "hi"')).toBe('say &quot;hi&quot;');
    });

    it('passes plain text through unchanged', () => {
      expect(escHtml('plain text')).toBe('plain text');
      expect(escHtml('ქართული ტექსტი')).toBe('ქართული ტექსტი');
    });

    it('escapes & first to avoid double-encoding', () => {
      expect(escHtml('<&>')).toBe('&lt;&amp;&gt;');
    });
  });

  describe('embedInspectionPhotos', () => {
    it('returns empty object for an empty list', async () => {
      const result = await embedInspectionPhotos([]);
      expect(result).toEqual({});
      expect(pdfPhotoEmbed).not.toHaveBeenCalled();
    });

    it('deduplicates paths before calling pdfPhotoEmbed', async () => {
      pdfPhotoEmbed.mockResolvedValue('data:image/jpeg;base64,TEST');
      const result = await embedInspectionPhotos(['a.jpg', 'b.jpg', 'a.jpg']);
      expect(pdfPhotoEmbed).toHaveBeenCalledTimes(2);
      expect(Object.keys(result).sort()).toEqual(['a.jpg', 'b.jpg']);
    });

    it('passes the answer-photos bucket and resize options', async () => {
      pdfPhotoEmbed.mockResolvedValue('data:image/jpeg;base64,TEST');
      await embedInspectionPhotos(['a.jpg']);
      expect(pdfPhotoEmbed).toHaveBeenCalledWith(
        'answer-photos',
        'a.jpg',
        { maxWidth: 400, quality: 0.65 },
      );
    });

    it('silently skips paths that fail to embed', async () => {
      pdfPhotoEmbed.mockImplementation(async (_bucket: string, path: string) => {
        if (path === 'broken.jpg') throw new Error('404');
        return `data:image/jpeg;base64,${path}`;
      });
      const result = await embedInspectionPhotos(['ok.jpg', 'broken.jpg']);
      expect(result['ok.jpg']).toBe('data:image/jpeg;base64,ok.jpg');
      expect(result['broken.jpg']).toBeUndefined();
    });
  });
});
