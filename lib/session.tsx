import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { purgeUserScopedStorage } from './storage-purge';
import type { AppUser } from '../types/models';

WebBrowser.maybeCompleteAuthSession();

type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; session: Session; user: AppUser | null };

interface SessionCtx {
  state: SessionState;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  register: (args: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<{ needsEmailVerification: boolean }>;
  verifySignupOtp: (email: string, token: string) => Promise<void>;
  resendSignupOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  acceptTerms: (version: string) => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  const loadUser = async (session: Session) => {
    const { data } = await supabase
      .from('users')
      .select()
      .eq('id', session.user.id)
      .maybeSingle();
    setState({ status: 'signedIn', session, user: (data as AppUser | null) ?? null });
  };

  useEffect(() => {
    // Track the last authenticated user id so we can detect account switches
    // on a shared device and purge the previous user's draft/offline data
    // before the new user starts writing.
    let lastUserId: string | null = null;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        lastUserId = data.session.user.id;
        void loadUser(data.session);
      } else {
        setState({ status: 'signedOut' });
      }
    }).catch((e) => {
      console.warn('[session] getSession failed', e);
      setState({ status: 'signedOut' });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null;
      // Token expiry → sign out so AuthGate routes to /login instead of
      // leaving the user on a stale screen with a dead session.
      if (event === 'TOKEN_REFRESHED' && !session) {
        setState({ status: 'signedOut' });
        return;
      }
      if (event === 'SIGNED_OUT' || (lastUserId && nextUserId && nextUserId !== lastUserId)) {
        void purgeUserScopedStorage();
      }
      lastUserId = nextUserId;
      if (session) {
        void loadUser(session);
      } else {
        setState({ status: 'signedOut' });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const api = useMemo<SessionCtx>(
    () => ({
      state,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signInWithGoogle: async () => {
        const redirectUrl = Linking.createURL('auth/callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (!data.url) throw new Error('No OAuth URL returned');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success') {
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
          if (sessionError) throw sessionError;
        } else if (result.type !== 'dismiss') {
          throw new Error('Google sign-in failed');
        }
      },
      register: async ({ email, password, firstName, lastName }) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName, last_name: lastName } },
        });
        if (error) throw error;
        if (!data.session) {
          return { needsEmailVerification: true };
        }
        return { needsEmailVerification: false };
      },
      verifySignupOtp: async (email, token) => {
        const { error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'signup',
        });
        if (error) throw error;
      },
      resendSignupOtp: async email => {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      resetPassword: async email => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
      },
      refreshUser: async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) await loadUser(data.session);
      },
      acceptTerms: async version => {
        if (state.status !== 'signedIn') throw new Error('Not signed in');
        const authUser = state.session.user;
        const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
        // If the row exists, just patch the TC columns — do NOT overwrite
        // first_name / last_name with blanks. Upsert would happily clobber
        // existing NOT NULL names when we only know empty fallbacks.
        if (state.user) {
          const { error } = await supabase
            .from('users')
            .update({
              tc_accepted_version: version,
              tc_accepted_at: new Date().toISOString(),
            })
            .eq('id', authUser.id);
          if (error) throw error;
        } else {
          // Row missing (trigger didn't run). Best-effort insert with whatever
          // names we can recover from auth metadata. Fall back to the email
          // local-part so NOT NULL columns always get a non-empty value.
          const emailLocal = (authUser.email ?? '').split('@')[0] || 'user';
          const firstName = (meta.first_name as string) || emailLocal;
          const lastName = (meta.last_name as string) || '';
          const { error } = await supabase.from('users').insert({
            id: authUser.id,
            email: authUser.email ?? '',
            first_name: firstName,
            last_name: lastName,
            tc_accepted_version: version,
            tc_accepted_at: new Date().toISOString(),
          });
          if (error) throw error;
        }
        await loadUser(state.session);
      },
    }),
    [state],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
