import type { SignatureRecord } from '../../../types/models';
import { load, now, save, uuid } from './_store';

export const signaturesApi = {
  list: async (inspectionId: string): Promise<SignatureRecord[]> => {
    const db = await load();
    return db.signatures.filter(s => s.inspection_id === inspectionId);
  },
  upsert: async (
    s: Omit<SignatureRecord, 'id' | 'signed_at'> & { id?: string },
  ): Promise<SignatureRecord> => {
    const db = await load();
    let row = db.signatures.find(
      x => x.inspection_id === s.inspection_id && x.signer_role === s.signer_role,
    );
    if (row) {
      Object.assign(row, s, { signed_at: now() });
    } else {
      row = { id: s.id ?? uuid(), signed_at: now(), ...s };
      db.signatures.push(row);
    }
    await save();
    return row;
  },
  remove: async (
    inspectionId: string,
    role: SignatureRecord['signer_role'],
  ) => {
    const db = await load();
    db.signatures = db.signatures.filter(
      s => !(s.inspection_id === inspectionId && s.signer_role === role),
    );
    await save();
  },
};
