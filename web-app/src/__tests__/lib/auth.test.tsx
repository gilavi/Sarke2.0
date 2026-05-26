/**
 * AuthProvider + useAuth tests. The existing page tests mock `@/lib/auth` away,
 * so the real module had ~1.6% coverage. This file exercises the source directly:
 * persisted-session read, signIn/signUp/signOut/sendPasswordReset/updatePassword,
 * profile fetch, and the useAuth guard.
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(),
  },
  passwordResetRedirect: vi.fn(() => 'https://app/#/reset'),
}));

import { supabase, passwordResetRedirect } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/lib/auth';
import { makeBuilder } from '../helpers/supabaseChain';

const getSession = supabase.auth.getSession as unknown as Mock;
const onAuthStateChange = supabase.auth.onAuthStateChange as unknown as Mock;
const signInWithPassword = supabase.auth.signInWithPassword as unknown as Mock;
const signUp = supabase.auth.signUp as unknown as Mock;
const signOut = supabase.auth.signOut as unknown as Mock;
const resetPasswordForEmail = supabase.auth.resetPasswordForEmail as unknown as Mock;
const updateUser = supabase.auth.updateUser as unknown as Mock;
const from = supabase.from as unknown as Mock;

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  getSession.mockResolvedValue({ data: { session: null } });
  // Default subscription stub.
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  from.mockReturnValue(makeBuilder({ data: null, error: null }));
});
afterEach(() => vi.restoreAllMocks());

describe('useAuth guard', () => {
  it('throws when used outside an AuthProvider', () => {
    // Suppress React's error log for this expected throw.
    const err = console.error;
    console.error = () => {};
    expect(() => renderHook(() => useAuth())).toThrow(/useAuth/);
    console.error = err;
  });
});

describe('AuthProvider — initial state', () => {
  it('starts with no session when localStorage is empty and getSession resolves null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    await waitFor(() => expect(getSession).toHaveBeenCalled());
  });

  it('reads a persisted session synchronously from localStorage', () => {
    const session = { access_token: 'tok', user: { id: 'u1', email: 'a@b.com' } };
    localStorage.setItem('sb-test-auth-token', JSON.stringify(session));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session?.access_token).toBe('tok');
    expect(result.current.user?.id).toBe('u1');
  });

  it('ignores corrupt localStorage entries', () => {
    localStorage.setItem('sb-test-auth-token', '{not-json');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session).toBeNull();
  });

  it('fetches the user profile when there is a session', async () => {
    const session = { access_token: 'tok', user: { id: 'u9', email: 'a@b.com' } };
    localStorage.setItem('sb-test-auth-token', JSON.stringify(session));
    // getSession runs a background revalidate that overwrites the persisted session;
    // return the same one so the profile effect doesn't get torn down.
    getSession.mockResolvedValue({ data: { session } });
    from.mockReturnValue(makeBuilder({
      data: { id: 'u9', first_name: 'გელა', last_name: 'ხელაძე', email: 'a@b.com' },
      error: null,
    }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.profile?.first_name).toBe('გელა'));
  });
});

describe('AuthProvider — actions', () => {
  it('signIn calls supabase.auth.signInWithPassword', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.signIn('a@b.com', 'pw'));
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
  });

  it('signIn throws when supabase returns an error', async () => {
    signInWithPassword.mockResolvedValue({ error: new Error('bad creds') });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(result.current.signIn('a@b.com', 'pw')).rejects.toThrow('bad creds');
  });

  it('signUp passes first_name/last_name as metadata', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.signUp({ email: 'a@b.com', password: 'pw', firstName: 'გელა', lastName: 'ხელაძე' }));
    expect(signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      options: { data: { first_name: 'გელა', last_name: 'ხელაძე' } },
    });
  });

  it('signOut delegates to supabase.auth.signOut', async () => {
    signOut.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.signOut());
    expect(signOut).toHaveBeenCalled();
  });

  it('sendPasswordReset uses passwordResetRedirect()', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.sendPasswordReset('a@b.com'));
    expect(resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', { redirectTo: 'https://app/#/reset' });
    expect(passwordResetRedirect).toHaveBeenCalled();
  });

  it('sendPasswordReset throws on error', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: new Error('rate limit') });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(result.current.sendPasswordReset('a@b.com')).rejects.toThrow('rate limit');
  });

  it('updatePassword delegates to supabase.auth.updateUser', async () => {
    updateUser.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.updatePassword('newpw'));
    expect(updateUser).toHaveBeenCalledWith({ password: 'newpw' });
  });
});
