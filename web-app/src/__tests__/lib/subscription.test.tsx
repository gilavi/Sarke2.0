import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));
vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cancelSubscription, usePaymentHistory } from '@/lib/subscription';
import { makeBuilder } from '../helpers/supabaseChain';

const rpc = supabase.rpc as unknown as Mock;
const from = supabase.from as unknown as Mock;

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.clearAllMocks());

describe('cancelSubscription', () => {
  it('calls the cancel_subscription RPC and returns the result', async () => {
    rpc.mockResolvedValue({ data: { cancelled: true, active_until: null }, error: null });
    await expect(cancelSubscription('u1')).resolves.toEqual({ cancelled: true, active_until: null });
    expect(rpc).toHaveBeenCalledWith('cancel_subscription', { user_id: 'u1' });
  });

  it('throws on RPC error', async () => {
    const err = new Error('rpc down');
    rpc.mockResolvedValue({ data: null, error: err });
    await expect(cancelSubscription('u1')).rejects.toBe(err);
  });
});

describe('usePaymentHistory', () => {
  it('fetches payment records for the signed-in user', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' } } as unknown as ReturnType<typeof useAuth>);
    from.mockReturnValue(makeBuilder({
      data: [{ id: 'pay1', bog_order_id: 'o', amount: 10, currency: 'GEL', status: 'success', created_at: 't' }],
      error: null,
    }));
    const { result } = renderHook(() => usePaymentHistory(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(from).toHaveBeenCalledWith('payment_records');
  });

  it('is disabled when no user is signed in', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as unknown as ReturnType<typeof useAuth>);
    const { result } = renderHook(() => usePaymentHistory(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(from).not.toHaveBeenCalled();
  });
});
