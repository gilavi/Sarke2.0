import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AppUser } from '../types/models';

type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; session: Session; user: AppUser | null };

interface SessionCtx {
  state: SessionState;
  signIn: (email: string, password: string) => Promise<void>;
  register: (args: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
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
      register: async ({ email, password, firstName, lastName }) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName },
          },
        });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
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
