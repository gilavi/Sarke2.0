import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { User } from '@supabase/supabase-js';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/lib/db/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/storage')>();
  return { ...actual, signedUrl: vi.fn(), upload: vi.fn() };
});

import { supabase } from '@/lib/supabase';
import { signedUrl, upload, STORAGE_BUCKETS } from '@/lib/db/storage';
import {
  countCertificates,
  listCertificates,
  signedCertificatePdfUrl,
  uploadCertificate,
} from '@/lib/data/certificates';
import { makeBuilder } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(upload).mockImplementation(async (_b, path) => path);
});
afterEach(() => vi.restoreAllMocks());

describe('countCertificates', () => {
  it('returns the head count, 0 when null', async () => {
    from.mockReturnValueOnce(makeBuilder({ count: 7, error: null }));
    expect(await countCertificates()).toBe(7);
    from.mockReturnValueOnce(makeBuilder({ count: null, error: null }));
    expect(await countCertificates()).toBe(0);
  });
});

describe('listCertificates', () => {
  it('orders by generated_at desc', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listCertificates();
    expect(b.order).toHaveBeenCalledWith('generated_at', { ascending: false });
  });
});

describe('signedCertificatePdfUrl', () => {
  it('uses the pdfs bucket', () => {
    vi.mocked(signedUrl).mockResolvedValue('u');
    void signedCertificatePdfUrl('c.pdf');
    expect(signedUrl).toHaveBeenCalledWith(STORAGE_BUCKETS.pdfs, 'c.pdf');
  });
});

describe('uploadCertificate', () => {
  it('uploads the PDF and inserts a record with the name as conclusion', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1717000000000);
    const b = makeBuilder({ data: { id: 'new' }, error: null });
    from.mockReturnValue(b);
    const f = new File(['x'], 'Act 12.pdf', { type: 'application/pdf' });

    await uploadCertificate(f, { id: 'u1' } as User);

    expect(upload).toHaveBeenCalledWith(
      STORAGE_BUCKETS.pdfs,
      'certificates/u1/1717000000000.pdf',
      f,
      { contentType: 'application/pdf' },
    );
    expect(b.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        pdf_url: 'certificates/u1/1717000000000.pdf',
        conclusion_text: 'Act 12',
      }),
    );
  });
});
