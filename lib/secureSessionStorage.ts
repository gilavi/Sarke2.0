// Keychain/Keystore-backed storage adapter for the Supabase auth session.
//
// Why not plain AsyncStorage:
//   The Supabase JS client persists the session blob via a configurable
//   `storage` adapter. AsyncStorage is unencrypted and is more prone to being
//   cleared by the OS (e.g. when iOS reclaims app storage, or some uncommon
//   re-install / re-sign edge cases on TestFlight). Keychain (iOS) and
//   EncryptedSharedPreferences/SQLite (Android) survive more of these events.
//
// Why we chunk:
//   SecureStore caps values at ~2 KB on Android. A Supabase session blob
//   (access token + refresh token + user metadata) typically runs 2.5–4 KB,
//   so a single `setItemAsync` call would silently fail on Android. We split
//   the value into 1.8 KB chunks and store a `__count` companion key.
//
// Migration:
//   `getItem` falls back to AsyncStorage on miss and copies any prior session
//   forward to SecureStore. This means existing logged-in users do NOT get
//   bounced to the login screen when this adapter ships.
//
// Failure mode:
//   If SecureStore throws (e.g. user has Keychain access disabled), every
//   call collapses to the AsyncStorage path so auth still works - at the
//   cost of the persistence improvements we were trying to make.

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHUNK_SIZE = 1800;
const CHUNK_COUNT_SUFFIX = '__count';
const CHUNK_SUFFIX = (i: number) => `__${i}`;
// Written before clearing old chunks, removed after the new write completes.
// If the app is killed mid-write, this flag tells readChunked to treat the
// data as corrupt (returning null) rather than assembling a partial session.
const CHUNK_WIP_SUFFIX = '__wip';

// SecureStore keys must be alphanumeric + `.`, `-`, `_`. Supabase keys
// (e.g. `sb-xxxxxxxx-auth-token`) already satisfy this, but sanitize defensively
// so future key changes don't break the adapter.
function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function readChunked(key: string): Promise<string | null> {
  try {
    // A WIP flag means a previous write was interrupted mid-operation; the
    // stored data may be partial. Return null so the caller treats it as
    // absent rather than trying to deserialise a corrupt session blob.
    const wip = await SecureStore.getItemAsync(key + CHUNK_WIP_SUFFIX);
    if (wip) return null;
    const single = await SecureStore.getItemAsync(key);
    if (single !== null) return single;
    const countStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
    if (!countStr) return null;
    const count = parseInt(countStr, 10);
    if (!Number.isFinite(count) || count <= 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(key + CHUNK_SUFFIX(i));
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  } catch {
    return null;
  }
}

async function clearChunks(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
  try {
    const prevCountStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
    if (prevCountStr) {
      const prevCount = parseInt(prevCountStr, 10);
      if (Number.isFinite(prevCount) && prevCount > 0) {
        for (let i = 0; i < prevCount; i++) {
          await SecureStore.deleteItemAsync(key + CHUNK_SUFFIX(i)).catch(() => undefined);
        }
      }
      await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX).catch(() => undefined);
    }
  } catch {
    /* swallow - we're best-effort here */
  }
}

async function writeChunked(key: string, value: string): Promise<void> {
  // Mark write as in-progress before touching existing data. clearChunks also
  // removes the WIP key, so we set it again immediately after.
  await SecureStore.setItemAsync(key + CHUNK_WIP_SUFFIX, '1').catch(() => undefined);
  await clearChunks(key);
  await SecureStore.setItemAsync(key + CHUNK_WIP_SUFFIX, '1').catch(() => undefined);
  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value);
    await SecureStore.deleteItemAsync(key + CHUNK_WIP_SUFFIX).catch(() => undefined);
    return;
  }
  const count = Math.ceil(value.length / CHUNK_SIZE);
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(
      key + CHUNK_SUFFIX(i),
      value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
    );
  }
  await SecureStore.setItemAsync(key + CHUNK_COUNT_SUFFIX, String(count));
  await SecureStore.deleteItemAsync(key + CHUNK_WIP_SUFFIX).catch(() => undefined);
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const safe = sanitizeKey(key);
    try {
      const fromSecure = await readChunked(safe);
      if (fromSecure !== null) return fromSecure;
    } catch {
      /* fall through to AsyncStorage */
    }
    // One-shot migration: lift any prior AsyncStorage-persisted session
    // into SecureStore so existing users don't get logged out by this
    // adapter swap.
    try {
      const fromAsync = await AsyncStorage.getItem(key);
      if (fromAsync != null) {
        try {
          await writeChunked(safe, fromAsync);
          await AsyncStorage.removeItem(key).catch(() => undefined);
        } catch {
          /* if the write fails, still return what we have */
        }
        return fromAsync;
      }
    } catch {
      /* ignore - auth will treat as signed-out */
    }
    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    const safe = sanitizeKey(key);
    try {
      await writeChunked(safe, value);
    } catch {
      // SecureStore unavailable - fall back to AsyncStorage so the session
      // is still persisted (just not as durably).
      await AsyncStorage.setItem(key, value).catch(() => undefined);
    }
  },

  async removeItem(key: string): Promise<void> {
    const safe = sanitizeKey(key);
    try {
      await clearChunks(safe);
    } catch {
      /* ignore - fall through to AsyncStorage cleanup */
    }
    await AsyncStorage.removeItem(key).catch(() => undefined);
  },
};
