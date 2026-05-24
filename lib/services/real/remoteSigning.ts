import * as Crypto from 'expo-crypto';
import { supabase, STORAGE_BUCKETS } from '../../supabase';
import type { RemoteSigningRequest, SignerRole } from '../../../types/models';

async function generateToken(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(24);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export const remoteSigningApi = {
  listByInspection: async (inspectionId: string): Promise<RemoteSigningRequest[]> => {
    const { data, error } = await supabase
      .from('remote_signing_requests')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as RemoteSigningRequest[];
  },

  create: async (args: {
    inspectionId: string;
    signerName: string;
    signerPhone: string;
    signerRole: SignerRole;
  }): Promise<RemoteSigningRequest> => {
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('not authenticated');

    // Latest cert PDF for the inspection (may be null if no cert yet).
    const { data: certs } = await supabase
      .from('certificates')
      .select('pdf_url')
      .eq('inspection_id', args.inspectionId)
      .order('generated_at', { ascending: false })
      .limit(1);
    const latestPdfPath = (certs?.[0] as { pdf_url?: string } | undefined)?.pdf_url ?? null;

    let pdfSignedUrl: string | null = null;
    if (latestPdfPath) {
      const { data: signed, error: sigErr } = await supabase.storage
        .from(STORAGE_BUCKETS.pdfs)
        .createSignedUrl(latestPdfPath, 14 * 24 * 60 * 60);
      if (sigErr) throw sigErr;
      pdfSignedUrl = signed.signedUrl;
    }

    const token = await generateToken();
    const { data, error } = await supabase
      .from('remote_signing_requests')
      .insert({
        token,
        inspection_id: args.inspectionId,
        expert_user_id: user.id,
        signer_name: args.signerName,
        signer_phone: args.signerPhone,
        signer_role: args.signerRole,
        pdf_signed_url: pdfSignedUrl,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as RemoteSigningRequest;
  },

  /** Invoke the send-signing-sms Edge Function which calls Twilio and marks the row 'sent'. */
  sendSMS: async (requestId: string): Promise<void> => {
    const { data, error } = await supabase.functions.invoke('send-signing-sms', {
      body: { requestId },
    });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  },

  cancel: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('remote_signing_requests')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  signedSignatureUrl: async (storagePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.remoteSignatures)
      .createSignedUrl(storagePath, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  },
};
