import { supabase } from '@/lib/supabase';

export type SubscriptionStatus = 'free' | 'active' | 'lapsed' | string;

export interface AccountUsage {
  status: SubscriptionStatus;
  expiresAt: string | null;
  pdfCount: number;
  pdfLimit: number;
}

// Mirrors PDF_FREE_LIMIT in lib/pdfGate.ts. Per CLAUDE.md memory, the
// soft-launch limit is 30; intentionally hard-coded here so the web view
// matches the mobile gate without an extra RPC.
const PDF_FREE_LIMIT = 30;

export async function getAccountUsage(userId: string): Promise<AccountUsage> {
  const { data, error } = await supabase
    .from('users')
    .select('pdf_count, subscription_status, subscription_expires_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  let status = ((data?.subscription_status as string) ?? 'free') as SubscriptionStatus;
  const expiresAt = (data?.subscription_expires_at as string | null) ?? null;
  if (status === 'active' && expiresAt) {
    const expiry = new Date(expiresAt);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
      status = 'lapsed';
    }
  }
  return {
    status,
    expiresAt,
    pdfCount: (data?.pdf_count as number | null) ?? 0,
    pdfLimit: PDF_FREE_LIMIT,
  };
}

export async function updateUserName(
  userId: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  // Update auth metadata (used by signup flows / session.user_metadata) and
  // the public.users row in parallel; the row is what the dashboard reads.
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
