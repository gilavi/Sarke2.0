import { describe, it, expect, vi, afterEach } from 'vitest';
import { urlToDataUrl, printAfterRender, A4_PRINT_STYLES } from '@/lib/printable';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('urlToDataUrl', () => {
  it('fetches the URL and returns a data: URL', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ blob: () => Promise.resolve(blob) }));
    const result = await urlToDataUrl('https://x/y.png');
    expect(result.startsWith('data:')).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('printAfterRender', () => {
  it('calls window.print after the delay', () => {
    vi.useFakeTimers();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    printAfterRender(500);
    expect(print).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('swallows errors thrown by window.print', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'print').mockImplementation(() => {
      throw new Error('cancelled');
    });
    printAfterRender(0);
    expect(() => vi.advanceTimersByTime(0)).not.toThrow();
  });
});

describe('A4_PRINT_STYLES', () => {
  it('declares an A4 page and the .doc layout', () => {
    expect(A4_PRINT_STYLES).toContain('@page');
    expect(A4_PRINT_STYLES).toContain('size: A4');
    expect(A4_PRINT_STYLES).toContain('.doc');
  });
});
