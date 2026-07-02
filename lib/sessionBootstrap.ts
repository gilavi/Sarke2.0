import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { secureSessionStorage } from './secureSessionStorage';
import { SUPABASE_AUTH_STORAGE_KEY } from './supabase';
import type { AppUser } from '../types/models';

const PROFILE_KEY_PREFIX = '@profile:';

/**
 * Read the persisted Supabase session straight from secure storage, without
 * touching the network. `supabase.auth.getSession()` refreshes an expired
 * token over the network (a 30-60s hang when offline); this reader only needs
 * identity so the app can boot signed-in from cache. Returns the session even
 * when `expires_at` is past — offline reads come from the persisted query
 * cache and writes queue for replay, so a live JWT isn't required to render.
 *
 * Returns null when no blob exists (never signed in / signed out) or the blob
 * doesn't parse. Goes through `secureSessionStorage.getItem`, which
 * transparently handles SecureStore chunking and the AsyncStorage-migration
 * fallback, so it always reads the exact blob supabase-js wrote.
 */
export async function readStoredSession(): Promise<Session | null> {
  try {
    const raw = await secureSessionStorage.getItem(SUPABASE_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session> | null;
    if (!parsed || typeof parsed.access_token !== 'string' || !parsed.user?.id) return null;
    return parsed as Session;
  } catch {
    return null;
  }
}

/**
 * Persist the users-row profile to AsyncStorage (`@profile:<userId>`) so the
 * next offline boot can render fully signed-in (terms version, saved
 * signature path, names) without the network fetch in safeLoadUser. Purged on
 * sign-out / account switch via lib/storage-purge.ts. Never throws.
 */
export async function cacheUserProfile(user: AppUser): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY_PREFIX + user.id, JSON.stringify(user));
  } catch {
    // A cache-write failure must never affect the auth flow.
  }
}

/**
 * Read the profile cached by the last successful users-row fetch. Null when
 * absent or corrupt — callers fall back to `user: null`, which AuthGate
 * already tolerates (no terms redirect until a profile is loaded).
 */
export async function readCachedUserProfile(userId: string): Promise<AppUser | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser | null;
    if (!parsed || parsed.id !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}
