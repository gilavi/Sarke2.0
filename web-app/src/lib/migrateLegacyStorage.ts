/**
 * One-time rename of legacy `sarke-*` localStorage keys to `hubble-*` (the
 * Sarke→Hubble rebrand). Copies each old value to the new key if the new key
 * isn't already set, then removes the old key. Preserves existing users'
 * theme / language / onboarding / pending-create state through the rename.
 *
 * Safe to call on every boot — it's idempotent (no-op once migrated).
 */
const PAIRS: readonly [string, string][] = [
  ['sarke-theme', 'hubble-theme'],
  ['sarke-lang', 'hubble-lang'],
  ['sarke-welcome-seen', 'hubble-welcome-seen'],
  ['sarke-checklist', 'hubble-checklist'],
  ['sarke-checklist-dismissed', 'hubble-checklist-dismissed'],
  ['sarke-pending-create', 'hubble-pending-create'],
];

export function migrateLegacyStorage(): void {
  try {
    for (const [oldKey, newKey] of PAIRS) {
      if (localStorage.getItem(newKey) === null) {
        const value = localStorage.getItem(oldKey);
        if (value !== null) localStorage.setItem(newKey, value);
      }
      localStorage.removeItem(oldKey);
    }
  } catch {
    /* localStorage unavailable (private mode / SSR) — nothing to migrate */
  }
}
