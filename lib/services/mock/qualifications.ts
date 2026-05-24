import type { Certificate, Qualification } from '../../../types/models';
import { load, now, save, uuid } from './_store';

export const qualificationsApi = {
  list: async (): Promise<Qualification[]> => {
    const db = await load();
    return [...db.qualifications].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  },
  upsert: async (q: Omit<Qualification, 'created_at'> & { created_at?: string }): Promise<Qualification> => {
    const db = await load();
    const withStamp: Qualification = { ...q, created_at: q.created_at ?? now() };
    const existing = db.qualifications.find(x => x.id === withStamp.id);
    if (existing) Object.assign(existing, withStamp);
    else db.qualifications.push(withStamp);
    await save();
    return existing ?? withStamp;
  },
  remove: async (id: string) => {
    const db = await load();
    db.qualifications = db.qualifications.filter(q => q.id !== id);
    await save();
  },
};

export const certificatesApi = {
  list: async (): Promise<Certificate[]> => {
    const db = await load();
    return [...db.certificates].sort((a, b) =>
      b.generated_at.localeCompare(a.generated_at),
    );
  },
  getById: async (id: string): Promise<Certificate | null> => {
    const db = await load();
    return db.certificates.find(c => c.id === id) ?? null;
  },
  listByInspection: async (inspectionId: string): Promise<Certificate[]> => {
    const db = await load();
    return db.certificates
      .filter(c => c.inspection_id === inspectionId)
      .sort((a, b) => b.generated_at.localeCompare(a.generated_at));
  },
  countsByInspection: async (
    inspectionIds: string[],
  ): Promise<Record<string, number>> => {
    const db = await load();
    const set = new Set(inspectionIds);
    const counts: Record<string, number> = {};
    for (const c of db.certificates) {
      if (!set.has(c.inspection_id)) continue;
      counts[c.inspection_id] = (counts[c.inspection_id] ?? 0) + 1;
    }
    return counts;
  },
  create: async (args: {
    inspectionId: string;
    templateId: string;
    pdfUrl: string;
    isSafeForUse: boolean | null;
    conclusionText: string | null;
    params?: Record<string, unknown>;
  }): Promise<Certificate> => {
    const db = await load();
    const cert: Certificate = {
      id: uuid(),
      inspection_id: args.inspectionId,
      user_id: db.user_id,
      template_id: args.templateId,
      pdf_url: args.pdfUrl,
      is_safe_for_use: args.isSafeForUse,
      conclusion_text: args.conclusionText,
      params: args.params ?? {},
      generated_at: now(),
    };
    db.certificates.push(cert);
    await save();
    return cert;
  },
  remove: async (id: string) => {
    const db = await load();
    db.certificates = db.certificates.filter(c => c.id !== id);
    await save();
  },
};

export function isExpiringSoon(q: Qualification): boolean {
  if (!q.expires_at) return false;
  const exp = new Date(q.expires_at).getTime();
  return exp - Date.now() < 30 * 864e5;
}
