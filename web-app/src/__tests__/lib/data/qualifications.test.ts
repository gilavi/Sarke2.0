import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/lib/db/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/storage')>();
  return { ...actual, signedUrl: vi.fn() };
});

import { supabase } from '@/lib/supabase';
import { signedUrl, STORAGE_BUCKETS } from '@/lib/db/storage';
import {
  QUALIFICATION_TYPE_LABEL,
  qualificationLabel,
  listQualifications,
  signedQualificationFileUrl,
  isExpiringSoon,
  isExpired,
} from '@/lib/data/qualifications';
import { makeBuilder } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;
const NOW = new Date('2026-05-26T00:00:00Z').getTime();
const daysFromNow = (d: number) => new Date(NOW + d * 86_400_000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => vi.restoreAllMocks());

describe('qualificationLabel', () => {
  it('maps known types and falls back to the raw value', () => {
    expect(qualificationLabel('harness_inspector')).toBe(QUALIFICATION_TYPE_LABEL.harness_inspector);
    expect(qualificationLabel('unknown')).toBe('unknown');
  });
});

describe('listQualifications', () => {
  it('orders by created_at desc', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listQualifications();
    expect(from).toHaveBeenCalledWith('qualifications');
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

describe('signedQualificationFileUrl', () => {
  it('uses the certificates bucket', () => {
    vi.mocked(signedUrl).mockResolvedValue('u');
    void signedQualificationFileUrl('q.pdf');
    expect(signedUrl).toHaveBeenCalledWith(STORAGE_BUCKETS.certificates, 'q.pdf');
  });
});

describe('isExpiringSoon', () => {
  it('is true within the next 30 days, false otherwise', () => {
    expect(isExpiringSoon(daysFromNow(10))).toBe(true);
    expect(isExpiringSoon(daysFromNow(40))).toBe(false);
    expect(isExpiringSoon(daysFromNow(-1))).toBe(false);
    expect(isExpiringSoon(null)).toBe(false);
    expect(isExpiringSoon('not-a-date')).toBe(false);
  });
});

describe('isExpired', () => {
  it('is true only for past dates', () => {
    expect(isExpired(daysFromNow(-1))).toBe(true);
    expect(isExpired(daysFromNow(1))).toBe(false);
    expect(isExpired(null)).toBe(false);
    expect(isExpired('not-a-date')).toBe(false);
  });
});
