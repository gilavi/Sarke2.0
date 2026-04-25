import { supabase, REMOTE_SIGNATURES_BUCKET } from './supabase';

export interface SigningRequestPayload {
  signer_name: string;
  signer_role: string;
  status: 'pending' | 'sent';
  inspection_title: string;
  project_name: string | null;
  completed_at: string | null;
  is_safe_for_use: boolean | null;
  conclusion_text: string | null;
  expert_name: string;
  pdf_signed_url: string | null;
  expires_at: string;
}

export type SigningRequestError = 'invalid' | 'expired' | 'consumed' | 'network';

export async function getSigningRequest(token: string): Promise<
  | { ok: true; data: SigningRequestPayload }
  | { ok: false; error: SigningRequestError }
> {
  const { data, error } = await supabase.rpc('get_signing_request', { p_token: token });
  if (error) return { ok: false, error: 'network' };
  if (!data || typeof data !== 'object') return { ok: false, error: 'invalid' };
  const obj = data as Record<string, unknown>;
  if (typeof obj.error === 'string') {
    return {
      ok: false,
      error: (obj.error as SigningRequestError) ?? 'invalid',
    };
  }
  return { ok: true, data: obj as unknown as SigningRequestPayload };
}

/**
 * Uploads the PNG to remote-signatures/<token>/<timestamp>.png and then
 * commits the storage path via submit_signature RPC.
 */
export async function submitSignature(
  token: string,
  pngBlob: Blob,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const path = `${token}/${Date.now()}.png`;
  const { error: upErr } = await supabase.storage
    .from(REMOTE_SIGNATURES_BUCKET)
    .upload(path, pngBlob, { contentType: 'image/png', upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const { data, error } = await supabase.rpc('submit_signature', {
    p_token: token,
    p_storage_path: path,
  });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    return { ok: false, error: String((data as Record<string, unknown>).error) };
  }
  return { ok: true };
}

export async function declineSignature(
  token: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('decline_signature', {
    p_token: token,
    p_reason: reason,
  });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    return { ok: false, error: String((data as Record<string, unknown>).error) };
  }
  return { ok: true };
}

export const SIGNER_ROLE_LABEL_KA: Record<string, string> = {
  expert: 'შრომის უსაფრთხოების სპეციალისტი',
  xaracho_supervisor: 'ხარაჩოს ზედამხედველი',
  xaracho_assembler: 'ხარაჩოს ამწყობი',
};
