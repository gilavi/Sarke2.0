// Shared internals for the real (Supabase-backed) services.
// Kept private to this folder — callers should depend on the per-domain APIs.

import { logError } from '../../logError';
import type { CrewMember, CrewRoleKey, Project } from '../../../types/models';
import { CREW_ROLE_KEYS, CREW_ROLE_LABEL } from '../../../types/models';

// Supabase boundary helpers. When a `guard` is supplied, schema drift throws
// here with a logged context instead of leaking undefined fields into the UI.
export type SupabaseRes = { data: unknown; error: { message: string } | null };
export type GuardOpts<T> = { guard?: (v: unknown) => v is T; context?: string };

function failShape(context: string): never {
  const err = new Error(`shape mismatch at ${context}`);
  logError(err, context);
  throw err;
}

function unwrap<T>(
  res: SupabaseRes,
  mode: 'required' | 'maybe' | 'list',
  opts?: GuardOpts<T>,
): T | T[] | null {
  if (res.error) throw new Error(res.error.message);
  const ctx = opts?.context ?? `unwrap.${mode}`;
  if (mode === 'list') {
    const rows = (res.data ?? []) as unknown[];
    if (opts?.guard) for (const row of rows) if (!opts.guard(row)) failShape(ctx);
    return rows as T[];
  }
  if (res.data == null) {
    if (mode === 'maybe') return null;
    throw new Error('No data');
  }
  if (opts?.guard && !opts.guard(res.data)) failShape(ctx);
  return res.data as T;
}

export function throwIfError<T>(res: SupabaseRes, opts?: GuardOpts<T>): T {
  return unwrap<T>(res, 'required', opts) as T;
}

export function throwIfErrorMaybe<T>(res: SupabaseRes, opts?: GuardOpts<T>): T | null {
  return unwrap<T>(res, 'maybe', opts) as T | null;
}

export function listOrThrow<T>(res: SupabaseRes, opts?: GuardOpts<T>): T[] {
  return unwrap<T>(res, 'list', opts) as T[];
}

/**
 * Coerce stored crew rows into the current shape. Legacy rows (pre role-slot
 * UX) lack a `roleKey`; we route them into the `other` slot rather than
 * dropping them, and reuse their stored `role` string as the display label.
 * After coercion, callers must dedupe by `roleKey` themselves — the slot UI
 * keeps only the first match per slot.
 */
export function mapCrew(rows: unknown): CrewMember[] {
  if (!Array.isArray(rows)) return [];
  const valid = new Set<CrewRoleKey>(CREW_ROLE_KEYS);
  return rows
    .map(r => {
      const row = (r ?? {}) as Partial<CrewMember> & Record<string, unknown>;
      const key: CrewRoleKey = valid.has(row.roleKey as CrewRoleKey)
        ? (row.roleKey as CrewRoleKey)
        : 'other';
      const role =
        typeof row.role === 'string' && row.role.trim().length > 0
          ? row.role
          : CREW_ROLE_LABEL[key];
      return {
        id: typeof row.id === 'string' ? row.id : `crew_${Math.random().toString(36).slice(2, 10)}`,
        roleKey: key,
        name: typeof row.name === 'string' ? row.name : '',
        role,
        signature: typeof row.signature === 'string' ? row.signature : null,
      } satisfies CrewMember;
    })
    .filter(m => m.name.length > 0);
}

export function withMappedCrew(p: Project | null): Project | null {
  if (!p) return p;
  return { ...p, crew: mapCrew(p.crew) };
}

const MAX_LOGO_BYTES = 1_000_000; // ~1 MB base64; over this slows down every projects-list query.

export function assertLogoSize(logo: string | null | undefined): void {
  if (typeof logo !== 'string') return;
  if (logo.length > MAX_LOGO_BYTES) {
    throw new Error('ლოგო ძალიან დიდია — გთხოვთ აირჩიოთ უფრო მცირე სურათი');
  }
}
