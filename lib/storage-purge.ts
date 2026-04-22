import AsyncStorage from '@react-native-async-storage/async-storage';

// Prefixes for any AsyncStorage key that holds user-specific draft data we
// must never leak across accounts on a shared device.
const USER_SCOPED_PREFIXES = [
  'wizard:',
  '@offline:',
  'pending-signatures',
];

/**
 * Remove every AsyncStorage key that belongs to the previous user's session.
 * Called on sign-out and when the authenticated user id changes, so a second
 * account signing in on the same device cannot flush the first account's
 * queued writes under its own auth token.
 *
 * Never throws — a purge failure must not block sign-out.
 */
export async function purgeUserScopedStorage(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = allKeys.filter((k) =>
      USER_SCOPED_PREFIXES.some((p) => k === p || k.startsWith(p)),
    );
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch {
    // Swallow — a purge failure shouldn't block sign-out.
  }
}
