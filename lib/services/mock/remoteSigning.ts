import type { RemoteSigningRequest, SignerRole } from '../../../types/models';
import { MOCK_IMAGE_URI } from './_store';

const _remoteSigningMem: RemoteSigningRequest[] = [];

export const remoteSigningApi = {
  listByInspection: async (
    inspectionId: string,
  ): Promise<RemoteSigningRequest[]> => {
    return _remoteSigningMem
      .filter(r => r.inspection_id === inspectionId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  create: async (args: {
    inspectionId: string;
    signerName: string;
    signerPhone: string;
    signerRole: SignerRole;
  }): Promise<RemoteSigningRequest> => {
    const now = new Date();
    const expires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const row: RemoteSigningRequest = {
      id: `mock-${Math.random().toString(36).slice(2, 10)}`,
      token: Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 18),
      inspection_id: args.inspectionId,
      expert_user_id: 'mock-user',
      signer_name: args.signerName,
      signer_phone: args.signerPhone,
      signer_role: args.signerRole,
      status: 'pending',
      pdf_signed_url: null,
      signature_png_url: null,
      signed_at: null,
      declined_reason: null,
      expires_at: expires.toISOString(),
      last_sent_at: null,
      created_at: now.toISOString(),
    };
    _remoteSigningMem.unshift(row);
    return row;
  },
  sendSMS: async (id: string): Promise<void> => {
    // Mock: just mark as sent locally — no real HTTP call.
    const r = _remoteSigningMem.find(x => x.id === id);
    if (r) { r.status = 'sent'; r.last_sent_at = new Date().toISOString(); }
  },
  cancel: async (id: string): Promise<void> => {
    const i = _remoteSigningMem.findIndex(x => x.id === id);
    if (i >= 0) _remoteSigningMem.splice(i, 1);
  },
  signedSignatureUrl: async (_path: string): Promise<string> => MOCK_IMAGE_URI,
};
