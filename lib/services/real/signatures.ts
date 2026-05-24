import { supabase } from '../../supabase';
import type { SignatureRecord } from '../../../types/models';
import { throwIfError } from './_shared';

// Signatures are scoped to `inspection_id` for now. Moving them onto
// certificates is part of the separate signature redesign.

export const signaturesApi = {
  list: async (inspectionId: string): Promise<SignatureRecord[]> => {
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('inspection_id', inspectionId);
    if (error) throw error;
    return data ?? [];
  },
  upsert: async (s: Omit<SignatureRecord, 'id' | 'signed_at'> & { id?: string }): Promise<SignatureRecord> => {
    return throwIfError<SignatureRecord>(
      await supabase
        .from('signatures')
        .upsert(
          { ...s, signed_at: new Date().toISOString() },
          { onConflict: 'inspection_id,signer_role' },
        )
        .select()
        .single(),
    );
  },
  remove: async (inspectionId: string, role: SignatureRecord['signer_role']) => {
    const { error } = await supabase
      .from('signatures')
      .delete()
      .eq('inspection_id', inspectionId)
      .eq('signer_role', role);
    if (error) throw error;
  },
};
