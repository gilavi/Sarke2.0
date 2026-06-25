// Profile updates. Mirrors `web-app/src/lib/data/account.ts:updateUserName` so
// the same change ripples through both auth metadata (used by signup flows
// and `session.user_metadata`) and the public.users row that all the app's
// list/detail screens read from.
//
// Keep this file small - the only profile mutation is name editing today. If
// more fields land (avatar, bio, …) add them here, not in a parallel helper.

import { supabase } from './supabase';

export async function updateProfile(
  userId: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const [{ error: metaErr }, { error: rowErr }] = await Promise.all([
    supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } }),
    supabase
      .from('users')
      .update({ first_name: firstName, last_name: lastName })
      .eq('id', userId),
  ]);
  if (metaErr) throw metaErr;
  if (rowErr) throw rowErr;
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account');
  if (!error) return;
  // supabase-js wraps any non-2xx response in a FunctionsHttpError whose message
  // is the opaque "Edge Function returned a non-2xx status code". The real cause
  // lives in the response body (`{ error: "<reason>" }`, set by the function) on
  // `error.context` — surface it so the toast and our logs show the actual
  // failure (e.g. a FK constraint blocking the auth.users cascade) instead of a
  // dead-end generic string.
  const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
  if (ctx && typeof ctx.json === 'function') {
    let detail: string | undefined;
    try {
      const body = (await ctx.json()) as { error?: string } | null;
      detail = body?.error ?? undefined;
    } catch {
      // Body wasn't JSON / already consumed — fall through to the original error.
    }
    if (detail) throw new Error(detail);
  }
  throw error;
}
