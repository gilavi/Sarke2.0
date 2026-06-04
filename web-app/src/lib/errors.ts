/**
 * User-facing error mapping for the web dashboard.
 *
 * Our users are Georgian-speaking safety inspectors. Raw Supabase/Postgres/network
 * errors ("new row violates row-level security policy", "Failed to fetch", "duplicate
 * key value violates unique constraint …") are jargon to them, and many are in English.
 *
 * `humanizeError` maps a thrown value to a short, actionable Georgian sentence (via the
 * i18next `errors.*` namespace in lib/i18n.ts). It is PURE — no side effects — so it is
 * safe to call during render (e.g. inside `<ErrorMessage>{humanizeError(err)}</ErrorMessage>`).
 *
 * `toastError` is the DRY replacement for the ~60 inline
 * `onError: (e) => toast.error(e instanceof Error ? e.message : String(e))` handlers:
 * it logs the RAW error to the console (for developers) and shows the HUMANIZED text to
 * the user. Use it as `onError: toastError` or `catch (e) { toastError(e); }`.
 *
 * Importing this module initializes i18n (side-effect of importing '@/lib/i18n'), so
 * `i18n.t` resolves even outside React.
 */
import { toast } from 'sonner';
import i18n from '@/lib/i18n';

/** Extract the raw message from any thrown value, without translating it. */
export function rawErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e ?? '');
}

/**
 * True for transient network/connectivity failures that are worth retrying
 * (construction-site Wi-Fi drops). Deliberately does NOT match RLS, duplicate-key,
 * validation or other 4xx errors — retrying those is pointless and, for a
 * non-idempotent create, risks a double write.
 */
export function isTransientError(e: unknown): boolean {
  const lower = rawErrorMessage(e).toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('load failed') ||
    lower.includes('err_network') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504')
  );
}

/**
 * Map a thrown value to a short, actionable, localized message.
 * Pure — safe to call during render. Order matters: more specific cases first.
 */
export function humanizeError(e: unknown): string {
  const raw = rawErrorMessage(e);
  const lower = raw.toLowerCase();
  const t = (key: string) => i18n.t(`errors.${key}`);

  if (!raw.trim()) return t('fallback');

  // RLS / permission. (Postgres "new row violates row-level security policy",
  // "permission denied", PostgREST 42501, "not authorized".)
  if (
    lower.includes('row-level security') ||
    lower.includes('row level security') ||
    lower.includes('permission denied') ||
    lower.includes('not authorized') ||
    lower.includes('42501')
  ) {
    return t('notAuthorized');
  }

  // Not signed in / expired session. (Our own 'არაავტორიზებული'/'Not signed in'
  // guards, plus JWT/auth-session errors from supabase-js.)
  if (
    raw.includes('არაავტორიზებული') ||
    lower.includes('not signed in') ||
    lower.includes('not authenticated') ||
    lower.includes('jwt') ||
    lower.includes('auth session') ||
    lower.includes('session missing') ||
    lower.includes('invalid login')
  ) {
    return t('notAuthenticated');
  }

  // Upload too large. (Storage 413, "Payload too large", "exceeded the maximum".)
  if (
    lower.includes('payload too large') ||
    lower.includes('413') ||
    lower.includes('maximum allowed size') ||
    lower.includes('exceeded the maximum') ||
    lower.includes('file size')
  ) {
    return t('payloadTooLarge');
  }

  // Network / offline. (fetch failures, timeouts — construction-site Wi-Fi.)
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('load failed') ||
    lower.includes('err_network') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('offline')
  ) {
    return t('network');
  }

  // Duplicate / unique violation. (Postgres 23505.)
  if (
    lower.includes('duplicate key') ||
    lower.includes('already exists') ||
    lower.includes('unique constraint') ||
    lower.includes('23505')
  ) {
    return t('duplicate');
  }

  // Rate limited.
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return t('rateLimit');
  }

  return t('fallback');
}

/**
 * Log the raw error (for developers) and show the humanized message to the user.
 * Drop-in for mutation `onError` handlers and `catch` blocks.
 */
export function toastError(e: unknown): void {
  // Keep the raw message in the console for debugging.
  console.error(e);
  toast.error(humanizeError(e));
}
