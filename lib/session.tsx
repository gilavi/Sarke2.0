import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
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
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void loadUser(data.session);
      } else {
        setState({ status: 'signedOut' });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
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
        // Upsert so acceptance succeeds even if the public.users row is missing
        // (e.g. user predates the handle_new_user trigger).
        const { error } = await supabase
          .from('users')
          .upsert(
            {
              id: authUser.id,
              email: authUser.email ?? state.user?.email ?? '',
              first_name: state.user?.first_name ?? (meta.first_name as string) ?? '',
              last_name: state.user?.last_name ?? (meta.last_name as string) ?? '',
              tc_accepted_version: version,
              tc_accepted_at: new Date().toISOString(),
            },
            { onConflict: 'id' },
          );
        if (error) throw error;
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
