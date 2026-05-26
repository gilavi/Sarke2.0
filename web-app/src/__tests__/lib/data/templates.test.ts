import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

import { supabase } from '@/lib/supabase';
import { SIGNER_ROLE_LABEL, getTemplate, listTemplates } from '@/lib/data/templates';
import { makeBuilder } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;

beforeEach(() => vi.clearAllMocks());

describe('SIGNER_ROLE_LABEL', () => {
  it('labels each signer role in Georgian', () => {
    expect(SIGNER_ROLE_LABEL.safety_engineer).toBe('უსაფრთხოების ინჟინერი');
    expect(SIGNER_ROLE_LABEL.other).toBe('სხვა');
  });
});

describe('getTemplate', () => {
  it('returns the row or null', async () => {
    from.mockReturnValueOnce(makeBuilder({ data: { id: 't1' }, error: null }));
    expect((await getTemplate('t1'))?.id).toBe('t1');
    from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    expect(await getTemplate('nope')).toBeNull();
  });
});

describe('listTemplates', () => {
  it('orders system templates first, then by name asc', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listTemplates();
    expect(b.order).toHaveBeenCalledWith('is_system', { ascending: false });
    expect(b.order).toHaveBeenCalledWith('name', { ascending: true });
  });

  it('throws on error', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(listTemplates()).rejects.toThrow('boom');
  });
});
