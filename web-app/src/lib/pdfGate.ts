import { supabase } from './supabase';

/** Must match the v_limit constant in the increment_pdf_count Postgres function. */
export const PDF_FREE_LIMIT = 30;

export interface PdfGateResult {
  allowed: boolean;
  count: number;
  limit: number;
}

/**
 * Thrown by checkAndIncrementPdfCount when the user has exhausted their
 * free-tier PDF allowance and does not have an active subscription.
 * Callers should catch this specifically and show <PaywallModal>.
 */
export class PdfLimitReachedError extends Error {
  readonly count: number;
  readonly limit: number;

  constructor(count: number, limit: number) {
    super('PDF limit reached');
    this.name = 'PdfLimitReachedError';
    this.count = count;
    this.limit = limit;
  }
}

/**
 * Atomically checks whether the user may generate another PDF and, if so,
 * increments their server-side pdf_count. Runs inside Postgres via
 * supabase.rpc — cannot be bypassed from the client.
 *
 * Usage pattern (when web PDF generation is added):
 *
 *   try {
 *     await checkAndIncrementPdfCount(userId);
 *     await generatePdf(...);
 *   } catch (e) {
 *     if (e instanceof PdfLimitReachedError) setPaywallOpen(true);
 *     else throw e;
 *   }
 *
 * @throws {PdfLimitReachedError} if the free-tier cap is hit.
 */
export async function checkAndIncrementPdfCount(userId: string): Promise<PdfGateResult> {
  const { data, error } = await supabase.rpc('increment_pdf_count', { user_id: userId });
  if (error) throw error;
  const result = data as PdfGateResult;
  if (!result.allowed) throw new PdfLimitReachedError(result.count, result.limit);
  return result;
}
