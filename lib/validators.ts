export function isEmail(s: string): boolean {
  if (!s) return false;
  // Pragmatic regex: non-space@non-space.tld
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/**
 * Validates a Georgian phone number.
 * Accepts:
 *   - Mobile: 5XX XXX XXX  (9 digits, starts with 5)
 *   - Landline: 3XX XXX XXX (9 digits, starts with 3; Tbilisi is 32X)
 *   - Optional +995 or 995 prefix
 *   - Tolerant to spaces, dashes, parentheses
 */
export function isGeorgianPhone(s: string): boolean {
  const digits = stripNonDigits(s);
  if (!digits) return false;
  const local = digits.startsWith('995') ? digits.slice(3) : digits;
  if (local.length !== 9) return false;
  const first = local[0];
  return first === '5' || first === '3';
}

/** Strips formatting and returns E.164 (+995XXXXXXXXX) if possible, else null. */
export function normalizePhone(s: string): string | null {
  const digits = stripNonDigits(s);
  if (!digits) return null;
  const local = digits.startsWith('995') ? digits.slice(3) : digits;
  if (local.length !== 9) return null;
  return `+995${local}`;
}

function stripNonDigits(s: string): string {
  return (s ?? '').replace(/\D+/g, '');
}
