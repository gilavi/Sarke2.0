// Rebrand (Sarke → Hubble): one-time rename of legacy `sarke.*` storage keys to
// `hubble.*`. Preserves the user's scheduled-reminder map (AsyncStorage) and
// Google Calendar OAuth tokens (SecureStore) through the rename so they don't
// have to re-link Google or lose pending reminders.
//
// The React Query cache key is intentionally NOT migrated - it's disposable
// (queries simply refetch), so it's just renamed in queryClient.ts.
//
// Idempotent: safe to call on every cold start. Once a full pass completes,
// a done-flag short-circuits future launches to a single AsyncStorage read —
// the SecureStore leg costs ~5-20 ms per keychain call (6 calls), which
// otherwise lands in the boot window forever.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const MIGRATION_DONE_KEY = 'hubble.migration.v1.done';

const ASYNC_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['sarke.reminders.map', 'hubble.reminders.map'],
];

const SECURE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['sarke.google.accessToken', 'hubble.google.accessToken'],
  ['sarke.google.refreshToken', 'hubble.google.refreshToken'],
  ['sarke.google.expiresAt', 'hubble.google.expiresAt'],
];

export async function migrateLegacyStorage(): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(MIGRATION_DONE_KEY)) != null) return;
  } catch {
    /* unreadable flag - fall through to the idempotent migration */
  }
  for (const [oldKey, newKey] of ASYNC_PAIRS) {
    try {
      if ((await AsyncStorage.getItem(newKey)) == null) {
        const value = await AsyncStorage.getItem(oldKey);
        if (value != null) await AsyncStorage.setItem(newKey, value);
      }
      await AsyncStorage.removeItem(oldKey);
    } catch {
      /* ignore - best-effort migration */
    }
  }
  for (const [oldKey, newKey] of SECURE_PAIRS) {
    try {
      if ((await SecureStore.getItemAsync(newKey)) == null) {
        const value = await SecureStore.getItemAsync(oldKey);
        if (value != null) await SecureStore.setItemAsync(newKey, value);
      }
      await SecureStore.deleteItemAsync(oldKey);
    } catch {
      /* ignore - best-effort migration */
    }
  }
  try {
    await AsyncStorage.setItem(MIGRATION_DONE_KEY, '1');
  } catch {
    /* ignore - the next launch simply re-runs the idempotent pass */
  }
}
