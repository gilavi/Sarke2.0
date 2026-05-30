import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { usePdfUsage, useInvalidatePdfUsage } from '@/lib/usePdfUsage';
import { makeBuilder } from '../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;
// Relative to the real clock so the +1d "future" / -1d "past" fixtures never
// go stale (a fixed date here became flaky once the wall clock passed it).
const NOW = Date.now();

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => vi.restoreAllMocks());

describe('usePdfUsage', () => {
  it('is disabled when no user is signed in', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);
    const { result } = renderHook(() => usePdfUsage(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(from).not.toHaveBeenCalled();
  });

  it('returns a free-plan usage record by default', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' } } as never);
    from.mockReturnValue(makeBuilder({
      data: { pdf_count: 5, subscription_status: 'free', subscription_expires_at: null, subscription_cancelled_at: null },
      error: null,
    }));
    const { result } = renderHook(() => usePdfUsage(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({
      count: 5,
      limit: 30,
      isLocked: false,
      status: 'free',
      expiresAt: null,
      cancelledAt: null,
    });
  });

  it('locks the row at the free limit and treats >= as isLocked', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' } } as never);
    from.mockReturnValue(makeBuilder({
      data: { pdf_count: 30, subscription_status: 'free', subscription_expires_at: null, subscription_cancelled_at: null },
      error: null,
    }));
    const { result } = renderHook(() => usePdfUsage(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.isLocked).toBe(true);
  });

  it('downgrades an active-but-past-expiry subscription to expired', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' } } as never);
    const past = new Date(NOW - 86_400_000).toISOString();
    from.mockReturnValue(makeBuilder({
      data: { pdf_count: 2, subscription_status: 'active', subscription_expires_at: past, subscription_cancelled_at: null },
      error: null,
    }));
    const { result } = renderHook(() => usePdfUsage(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.status).toBe('expired');
  });

  it('keeps an active, unexpired subscription unlocked', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' } } as never);
    const future = new Date(NOW + 86_400_000).toISOString();
    from.mockReturnValue(makeBuilder({
      data: { pdf_count: 50, subscription_status: 'active', subscription_expires_at: future, subscription_cancelled_at: null },
      error: null,
    }));
    const { result } = renderHook(() => usePdfUsage(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.status).toBe('active');
    expect(result.current.data?.isLocked).toBe(false);
  });
});

describe('useInvalidatePdfUsage', () => {
  it('returns a callable that invalidates the usage query', () => {
    const { result } = renderHook(() => useInvalidatePdfUsage(), { wrapper });
    expect(typeof result.current).toBe('function');
    expect(() => result.current()).not.toThrow();
  });
});
