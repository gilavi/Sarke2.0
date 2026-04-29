import { toErrorMessage } from './logError';

export function friendlyError(err: unknown, fallback = 'უცნობი შეცდომა'): string {
  const msg = toErrorMessage(err);
  const lower = msg.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials'))
    return 'არასწორი ელ-ფოსტა ან პაროლი';
  if (lower.includes('email not confirmed'))
    return 'გთხოვთ, დაადასტუროთ ელ-ფოსტა, შემდეგ სცადეთ შესვლა';
  if (lower.includes('password should be at least'))
    return 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს';
  if (lower.includes('rate limit') || lower.includes('too many'))
    return 'ძალიან ბევრი მცდელობა. მოიცადეთ და კვლავ სცადეთ';
  if (
    lower.includes('network') ||
    lower.includes('fetch failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('offline') ||
    lower.includes('timeout')
  )
    return 'ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი';
  if (lower.includes('cancelled') || lower.includes('canceled')) return 'ოპერაცია გაუქმდა';
  // Word-boundary the numeric codes so "4040" / "5040" don't false-positive.
  if (lower.includes('not found') || /\b404\b/.test(lower)) return 'მონაცემი ვერ მოიძებნა';
  if (lower.includes('permission') || lower.includes('forbidden') || /\b403\b/.test(lower))
    return 'წვდომა აკრძალულია';
  if (lower.includes('duplicate') || lower.includes('unique constraint'))
    return 'უკვე არსებობს';
  return msg || fallback;
}

export function isEmailTakenError(err: unknown): boolean {
  const lower = toErrorMessage(err).toLowerCase();
  return lower.includes('already registered') || lower.includes('user already exists');
}

export function isCancelledError(err: unknown): boolean {
  const lower = toErrorMessage(err).toLowerCase();
  return lower.includes('cancelled') || lower.includes('canceled');
}
