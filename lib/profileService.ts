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
  if (error) throw error;
}
