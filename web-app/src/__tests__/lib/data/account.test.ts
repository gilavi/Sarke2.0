import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { updateUser: vi.fn() } },
}));

import { supabase } from '@/lib/supabase';
import { getAccountUsage, updateUserName } from '@/lib/data/account';
import { makeBuilder } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;
const updateUser = supabase.auth.updateUser as unknown as Mock;
const NOW = new Date('2026-05-26T00:00:00Z').getTime();

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => vi.restoreAllMocks());

describe('getAccountUsage', () => {
  it('defaults to free / 0 PDFs / limit 30 when the row is empty', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await getAccountUsage('u1')).toEqual({
      status: 'free',
      expiresAt: null,
      pdfCount: 0,
      pdfLimit: 30,
    });
  });

  it('keeps an active, unexpired subscription active', async () => {
    const future = new Date(NOW + 86_400_000).toISOString();
    from.mockReturnValue(makeBuilder({
      data: { subscription_status: 'active', subscription_expires_at: future, pdf_count: 12 },
      error: null,
    }));
    const usage = await getAccountUsage('u1');
    expect(usage.status).toBe('active');
    expect(usage.pdfCount).toBe(12);
  });

  it('downgrades an active-but-expired subscription to lapsed', async () => {
    const past = new Date(NOW - 86_400_000).toISOString();
    from.mockReturnValue(makeBuilder({
      data: { subscription_status: 'active', subscription_expires_at: past, pdf_count: 3 },
      error: null,
    }));
    expect((await getAccountUsage('u1')).status).toBe('lapsed');
  });

  it('throws on error', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(getAccountUsage('u1')).rejects.toThrow('boom');
  });
});

describe('updateUserName', () => {
  it('updates auth metadata and the users row in parallel', async () => {
    updateUser.mockResolvedValue({ error: null });
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);

    await updateUserName('u1', 'გელა', 'ხელაძე');

    expect(updateUser).toHaveBeenCalledWith({ data: { first_name: 'გელა', last_name: 'ხელაძე' } });
    expect(b.update).toHaveBeenCalledWith({ first_name: 'გელა', last_name: 'ხელაძე' });
    expect(b.eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('throws when the auth metadata update fails', async () => {
    updateUser.mockResolvedValue({ error: new Error('meta failed') });
    from.mockReturnValue(makeBuilder({ error: null }));
    await expect(updateUserName('u1', 'a', 'b')).rejects.toThrow('meta failed');
  });

  it('throws when the row update fails', async () => {
    updateUser.mockResolvedValue({ error: null });
    from.mockReturnValue(makeBuilder({ error: new Error('row failed') }));
    await expect(updateUserName('u1', 'a', 'b')).rejects.toThrow('row failed');
  });
});
