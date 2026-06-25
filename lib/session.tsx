import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { purgeUserScopedStorage } from './storage-purge';
import { logError } from './logError';
import { TERMS_VERSION } from './terms';
import { queryClient } from './queryClient';
import { warmHomeCaches } from './apiHooks';
import type { AppUser } from '../types/models';

const EMAIL_STORAGE_KEY = '@auth:email';

// Dev-only: when expo.extra.useMockData is true, skip Supabase auth and pin a
// fake signed-in user so the post-auth flows can be exercised without a real
// backend. Has no effect in production builds (flag is false in main).
const useMockAuth = Constants.expoConfig?.extra?.useMockData === true;
const MOCK_USER_ID = '00000000-0000-0000-0000-00000000beef';
const MOCK_SESSION = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: MOCK_USER_ID,
    aud: 'authenticated',
    email: 'mock@hubble.dev',
    user_metadata: { first_name: 'Mock', last_name: 'User' },
    app_metadata: {},
    created_at: new Date().toISOString(),
  },
} as unknown as Session;
const MOCK_USER: AppUser = {
  id: MOCK_USER_ID,
  email: 'mock@hubble.dev',
  first_name: 'Mock',
  last_name: 'User',
  created_at: new Date().toISOString(),
  tc_accepted_version: TERMS_VERSION,
  tc_accepted_at: new Date().toISOString(),
  saved_signature_url: null,
};

WebBrowser.maybeCompleteAuthSession();

// Supabase rejects getSession() with this when AsyncStorage holds a
// refresh token the auth server no longer accepts (re-installed app,
// rotated key, expired session). It is an expected transient state on
// boot, not a programmer error - surface it as signed-out, not as a
// red LogBox banner.
function isStaleRefreshToken(err: unknown): boolean {
  const msg =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : '';
  const lower = msg.toLowerCase();
  return (
    lower.includes('refresh token') &&
    (lower.includes('not found') || lower.includes('invalid') || lower.includes('expired'))
  );
}

type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; session: Session; user: AppUser | null };

interface SessionCtx {
  state: SessionState;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** Native Sign in with Apple (iOS only - Apple guideline 4.8). Resolves
   *  silently when the user dismisses the sheet. On first authorization Apple
   *  returns the full name once; it is persisted to the users row + auth
   *  metadata immediately or it is lost forever. */
  signInWithApple: () => Promise<void>;
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
  /** Returns true if an account with this email exists in auth.users.
   *  Backed by the email_exists() RPC; used by the login UI to distinguish
   *  "no such account" from "wrong password". */
  emailExists: (email: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  acceptTerms: (version: string) => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(
    useMockAuth
      ? { status: 'signedIn', session: MOCK_SESSION, user: MOCK_USER }
      : { status: 'loading' },
  );

  const loadUser = async (session: Session) => {
    const { data } = await supabase
      .from('users')
      .select()
      .eq('id', session.user.id)
      .maybeSingle();
    setState({ status: 'signedIn', session, user: (data as AppUser | null) ?? null });
  };

  useEffect(() => {
    if (useMockAuth) return;
    // Track the last authenticated user id so we can detect account switches
    // on a shared device and purge the previous user's draft/offline data
    // before the new user starts writing.
    let lastUserId: string | null = null;
    // Epoch guard: a stale getSession() result must not overwrite a later
    // sign-out. Each safe-load gets a token; only the latest may commit state.
    let epoch = 0;
    let cancelled = false;

    const safeLoadUser = async (session: Session) => {
      const myEpoch = ++epoch;
      try {
        const { data } = await supabase
          .from('users')
          .select()
          .eq('id', session.user.id)
          .maybeSingle();
        if (cancelled || myEpoch !== epoch) return;
        setState({ status: 'signedIn', session, user: (data as AppUser | null) ?? null });
        // Warm EVERY Home-screen cache in the background now that the JWT is
        // provably live (the users-row fetch above just succeeded). The user is
        // most likely heading for home or the projects tab next; this saves the
        // cold-fetch wait on first arrival.
        //
        // `warmHomeCaches` prefetches projects, qualifications, templates AND the
        // five record-widget lists with `staleTime: 0`, forcing a network round-
        // trip even when a cached value exists. Without it, a mount-time query
        // that raced JWT propagation and returned an RLS-empty `[]` would stick
        // for the 5-minute default staleTime, leaving Home showing projects but
        // no record widgets until pull-to-refresh. Projects were warmed here since
        // 2026-05-27; the record widgets are added 2026-06-25 to close the same
        // race. See `docs/reports/BUG_REPORT.md` ("Home shows empty projects
        // after first login").
        //
        // Fire-and-forget so a network blip here can't delay post-auth nav.
        warmHomeCaches(queryClient);
      } catch (e) {
        if (cancelled || myEpoch !== epoch) return;
        logError(e, 'session.loadUser');
        // Auth says signed-in; profile fetch failed. Keep the session so the
        // user isn't bounced to login over a transient error.
        setState({ status: 'signedIn', session, user: null });
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        lastUserId = data.session.user.id;
        void safeLoadUser(data.session);
      } else {
        setState({ status: 'signedOut' });
      }
    }).catch((e) => {
      if (cancelled) return;
      // Stale/invalid refresh token from a previous install or expired
      // session - clear it so the next boot starts clean, and treat as
      // a normal signed-out boot. Don't log: this isn't an error worth
      // surfacing to the dev LogBox or the on-device error ring.
      if (isStaleRefreshToken(e)) {
        void supabase.auth.signOut().catch(() => {});
      } else {
        logError(e, 'session.getSession');
      }
      setState({ status: 'signedOut' });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      const nextUserId = session?.user?.id ?? null;
      // Token expiry → sign out so AuthGate routes to /login instead of
      // leaving the user on a stale screen with a dead session.
      if (event === 'TOKEN_REFRESHED' && !session) {
        epoch++;
        setState({ status: 'signedOut' });
        return;
      }
      if (event === 'SIGNED_OUT' || (lastUserId && nextUserId && nextUserId !== lastUserId)) {
        void purgeUserScopedStorage().catch((e) => logError(e, 'session.purgeUserScopedStorage'));
        // Drop every cached query - without this, a second account signing in
        // on the same device briefly sees the previous user's projects/
        // inspections from React Query's in-memory cache before the warming
        // prefetch lands.
        queryClient.clear();
      }
      lastUserId = nextUserId;
      if (session) {
        try {
          void AsyncStorage.setItem(EMAIL_STORAGE_KEY, session.user.email ?? '').catch(() => {});
        } catch {
          // Storage failure shouldn't block auth
        }
        void safeLoadUser(session);
      } else {
        epoch++;
        setState({ status: 'signedOut' });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const api = useMemo<SessionCtx>(
    () => ({
      state,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) return;
        // Supabase deliberately returns the same "Invalid login credentials"
        // string for both "email not found" and "wrong password" to prevent
        // user enumeration. The login screen wants distinct UX, so we probe
        // email_exists() and re-throw a tagged error the UI can discriminate
        // (see lib/errorMap.ts: isAccountNotFoundError / isWrongPasswordError).
        const lower = (error.message ?? '').toLowerCase();
        if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
          try {
            const { data } = await supabase.rpc('email_exists', { p_email: email });
            if (data === false) throw new Error('AccountNotFound');
            throw new Error('WrongPassword');
          } catch (e) {
            // If the RPC itself fails (network / not deployed yet), fall back
            // to the original error message - better generic-but-correct than
            // wrongly claiming "wrong password" when we can't actually tell.
            if (e instanceof Error && (e.message === 'AccountNotFound' || e.message === 'WrongPassword')) {
              throw e;
            }
            throw error;
          }
        }
        throw error;
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
      signInWithApple: async () => {
        // Replay-protection nonce: Apple signs the SHA-256 hash, Supabase
        // verifies the raw value against the token's nonce claim.
        const rawNonce = Crypto.randomUUID();
        const hashedNonce = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          rawNonce,
        );
        let credential: AppleAuthentication.AppleAuthenticationCredential;
        try {
          credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashedNonce,
          });
        } catch (e) {
          // User dismissed the native sheet - not an error.
          if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
          throw e;
        }
        if (!credential.identityToken) throw new Error('No identity token');
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
          nonce: rawNonce,
        });
        if (error) throw error;

        // Apple returns fullName ONLY on the very first authorization. The
        // handle_new_user trigger has already inserted the users row with
        // empty names (no metadata at insert time), so patch both the row
        // and the auth metadata now - best-effort, never block sign-in.
        const firstName = credential.fullName?.givenName?.trim() ?? '';
        const lastName = credential.fullName?.familyName?.trim() ?? '';
        if ((firstName || lastName) && data.user) {
          const patch: Record<string, string> = {};
          if (firstName) patch.first_name = firstName;
          if (lastName) patch.last_name = lastName;
          await supabase.auth.updateUser({ data: patch }).catch(() => {});
          const { error: nameError } = await supabase
            .from('users')
            .update(patch)
            .eq('id', data.user.id);
          if (nameError) logError(nameError, 'session.signInWithApple.persistName');
          // The SIGNED_IN listener may have fetched the row before the patch
          // landed - re-read so the UI shows the name immediately.
          if (data.session) await loadUser(data.session).catch(() => {});
        }
      },
      register: async ({ email, password, firstName, lastName }) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName },
            emailRedirectTo: Linking.createURL('/verify-email'),
          },
        });
        if (error) throw error;
        // Supabase's no-enumeration default: when "Confirm email" is on and the
        // email is already registered, signUp returns success with a user that
        // has an EMPTY identities array (no auth methods linked) instead of an
        // error. Translate that into a real "User already registered" error so
        // the UI can show the right message (isEmailTakenError in errorMap).
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error('User already registered');
        }
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
          options: { emailRedirectTo: Linking.createURL('/verify-email') },
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem(EMAIL_STORAGE_KEY).catch(() => {});
      },
      resetPassword: async email => {
        const redirectTo = Linking.createURL('/reset');
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
      },
      emailExists: async email => {
        const trimmed = email.trim();
        if (!trimmed) return false;
        const { data, error } = await supabase.rpc('email_exists', { p_email: trimmed });
        if (error) throw error;
        return data === true;
      },
      refreshUser: async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) await loadUser(data.session);
      },
      acceptTerms: async version => {
        if (state.status !== 'signedIn') throw new Error('Not signed in');
        const authUser = state.session.user;
        const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
        // If the row exists, just patch the TC columns - do NOT overwrite
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
