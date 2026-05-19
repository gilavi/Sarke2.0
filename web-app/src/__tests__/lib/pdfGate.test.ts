import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDF_FREE_LIMIT, PdfLimitReachedError, checkAndIncrementPdfCount } from '@/lib/pdfGate';

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '@/lib/supabase';
const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PDF_FREE_LIMIT', () => {
  it('is 30', () => {
    expect(PDF_FREE_LIMIT).toBe(30);
  });
});

describe('PdfLimitReachedError', () => {
  it('is an instance of Error', () => {
    expect(new PdfLimitReachedError(30, 30)).toBeInstanceOf(Error);
  });

  it('has the correct name', () => {
    expect(new PdfLimitReachedError(5, 30).name).toBe('PdfLimitReachedError');
  });

  it('stores count and limit', () => {
    const err = new PdfLimitReachedError(12, 30);
    expect(err.count).toBe(12);
    expect(err.limit).toBe(30);
  });

  it('has human-readable message', () => {
    expect(new PdfLimitReachedError(30, 30).message).toBe('PDF limit reached');
  });
});

describe('checkAndIncrementPdfCount', () => {
  it('resolves with result when allowed', async () => {
    const result = { allowed: true, count: 5, limit: 30 };
    mockRpc.mockResolvedValueOnce({ data: result, error: null });

    await expect(checkAndIncrementPdfCount('user-1')).resolves.toEqual(result);
    expect(mockRpc).toHaveBeenCalledWith('increment_pdf_count', { user_id: 'user-1' });
  });

  it('throws PdfLimitReachedError when not allowed', async () => {
    mockRpc.mockResolvedValueOnce({ data: { allowed: false, count: 30, limit: 30 }, error: null });

    await expect(checkAndIncrementPdfCount('user-1')).rejects.toBeInstanceOf(PdfLimitReachedError);
  });

  it('PdfLimitReachedError carries correct count/limit from server', async () => {
    mockRpc.mockResolvedValueOnce({ data: { allowed: false, count: 30, limit: 30 }, error: null });

    try {
      await checkAndIncrementPdfCount('user-1');
    } catch (e) {
      expect(e).toBeInstanceOf(PdfLimitReachedError);
      expect((e as PdfLimitReachedError).count).toBe(30);
      expect((e as PdfLimitReachedError).limit).toBe(30);
    }
  });

  it('rethrows Supabase RPC errors', async () => {
    const rpcError = new Error('network failure');
    mockRpc.mockResolvedValueOnce({ data: null, error: rpcError });

    await expect(checkAndIncrementPdfCount('user-1')).rejects.toBe(rpcError);
  });
});
