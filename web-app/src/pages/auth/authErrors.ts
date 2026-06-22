/**
 * Translate Supabase auth errors (English) into Georgian. Falls back to the
 * raw message only for cases we don't recognise - keeps the Georgian UI
 * consistent and avoids surfacing internal English text on the auth screens.
 *
 * Shared by Login.tsx and SocialAuthButtons.tsx so the mapping lives in one
 * place (see docs/primitives.md - don't re-invent the same helper twice).
 */
export function localizeAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'მცდარი ელ-ფოსტა ან პაროლი';
  if (lower.includes('email not confirmed')) return 'ელ-ფოსტა არ არის დადასტურებული';
  if (lower.includes('user not found')) return 'მომხმარებელი ვერ მოიძებნა';
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'მცდელობების ლიმიტი ამოწურულია, სცადეთ მოგვიანებით';
  }
  // OAuth (Google/Apple) popup/redirect cancellation or provider failure.
  if (lower.includes('popup') || lower.includes('cancel') || lower.includes('oauth')) {
    return 'ავტორიზაცია გაუქმდა';
  }
  if (lower.includes('network')) return 'ქსელის შეცდომა, შეამოწმეთ ინტერნეტი';
  return msg || 'შესვლა ვერ მოხერხდა';
}
