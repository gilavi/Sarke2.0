import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: { rpc: (...args: any[]) => mockRpc(...args) },
}));

const {
  PDF_FREE_LIMIT,
  PdfLimitReachedError,
  checkAndIncrementPdfCount,
} = await import('../../lib/pdfGate');

beforeEach(() => {
  mockRpc.mockReset();
});

describe('pdfGate', () => {
  describe('PDF_FREE_LIMIT', () => {
    it('matches the documented value (1000)', () => {
      expect(PDF_FREE_LIMIT).toBe(1000);
    });
  });

  describe('PdfLimitReachedError', () => {
    it('extends Error and carries count + limit', () => {
      const err = new PdfLimitReachedError(30, 30);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(PdfLimitReachedError);
      expect(err.name).toBe('PdfLimitReachedError');
      expect(err.message).toBe('PDF limit reached');
      expect(err.count).toBe(30);
      expect(err.limit).toBe(30);
    });
  });

  describe('checkAndIncrementPdfCount', () => {
    it('resolves with the result when allowed', async () => {
      mockRpc.mockResolvedValue({
        data: { allowed: true, count: 5, limit: 30 },
        error: null,
      });
      const result = await checkAndIncrementPdfCount('user-1');
      expect(result).toEqual({ allowed: true, count: 5, limit: 30 });
      expect(mockRpc).toHaveBeenCalledWith('increment_pdf_count', { user_id: 'user-1' });
    });

    it('throws PdfLimitReachedError when not allowed', async () => {
      mockRpc.mockResolvedValue({
        data: { allowed: false, count: 30, limit: 30 },
        error: null,
      });
      await expect(checkAndIncrementPdfCount('user-1')).rejects.toBeInstanceOf(PdfLimitReachedError);
      try {
        await checkAndIncrementPdfCount('user-1');
      } catch (err) {
        expect(err).toBeInstanceOf(PdfLimitReachedError);
        const e = err as InstanceType<typeof PdfLimitReachedError>;
        expect(e.count).toBe(30);
        expect(e.limit).toBe(30);
      }
    });

    it('rethrows RPC errors', async () => {
      const rpcError = new Error('Network down');
      mockRpc.mockResolvedValue({ data: null, error: rpcError });
      await expect(checkAndIncrementPdfCount('user-1')).rejects.toBe(rpcError);
    });
  });
});
