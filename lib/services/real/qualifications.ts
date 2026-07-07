import { supabase } from '../../supabase';
import { logError } from '../../logError';
import type { Certificate, Qualification } from '../../../types/models';
import { isMissingDbObjectError, throwIfError } from './_shared';

// Qualifications = the expert's professional certificates
// (xaracho_inspector / harness_inspector / …). Formerly `certificatesApi`.

export const qualificationsApi = {
  list: async (): Promise<Qualification[]> => {
    const { data, error } = await supabase
      .from('qualifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  upsert: async (q: Omit<Qualification, 'created_at'> & { created_at?: string }): Promise<Qualification> => {
    // Always stamp with the current auth uid. Callers can pass stale or
    // placeholder user_ids - RLS would reject anyway, but overriding here
    // turns a silent 403 into a predictable insert. created_at is handled
    // by the table default when omitted.
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    return throwIfError<Qualification>(
      await supabase
        .from('qualifications')
        .upsert({ ...q, user_id: user.id }, { onConflict: 'id' })
        .select()
        .single(),
    );
  },
  remove: async (id: string) => {
    const { error } = await supabase.from('qualifications').delete().eq('id', id);
    if (error) throw error;
  },
};

// Certificates = generated PDFs derived from inspections (1 inspection : N
// certificates). Generation is explicit - callers pass a pre-rendered PDF
// path (already uploaded to Storage) plus a snapshot of the inspection
// payload, so the rendering concern stays in `lib/pdf.ts` + the screen that
// orchestrates signature capture. This keeps the API testable without a
// PDF backend.

// Flips false (for the rest of the session) after the first call in an
// environment where the get_certificate_counts RPC isn't deployed, so
// countsByInspection doesn't retry a doomed request on every badge refresh.
let certCountsRpcAvailable = true;

export const certificatesApi = {
  /** All certificates visible to the current user (RLS-scoped). */
  list: async (): Promise<Certificate[]> => {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .order('generated_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  getById: async (id: string): Promise<Certificate | null> => {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Certificate | null) ?? null;
  },
  listByInspection: async (inspectionId: string): Promise<Certificate[]> => {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('generated_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  /**
   * Cheap count-per-inspection used by list screens to show a "N attached"
   * badge without paying for full certificate rows. Prefers the grouped
   * get_certificate_counts RPC (migration 20260708120000_lean_list_feeds.sql):
   * ≤ one row per inspection instead of one row per certificate. Falls back to
   * the legacy fetch-ids-and-count-client-side path when the RPC isn't
   * deployed in this environment yet.
   */
  countsByInspection: async (inspectionIds: string[]): Promise<Record<string, number>> => {
    if (inspectionIds.length === 0) return {};
    if (certCountsRpcAvailable) {
      const rpc = await supabase.rpc('get_certificate_counts', {
        p_inspection_ids: inspectionIds,
      });
      if (!rpc.error) {
        const counts: Record<string, number> = {};
        for (const row of (rpc.data ?? []) as Array<{ inspection_id: string; cert_count: number }>) {
          counts[row.inspection_id] = Number(row.cert_count);
        }
        return counts;
      }
      if (!isMissingDbObjectError(rpc.error)) throw rpc.error;
      certCountsRpcAvailable = false;
    }
    // Hard cap - list screens never need more than a few thousand cert
    // fingerprints and an uncapped query on a big DB would blow up memory.
    const { data, error } = await supabase
      .from('certificates')
      .select('inspection_id')
      .in('inspection_id', inspectionIds)
      .limit(10_000);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ inspection_id: string }>) {
      counts[row.inspection_id] = (counts[row.inspection_id] ?? 0) + 1;
    }
    return counts;
  },
  /**
   * Persist a new certificate row. The caller is responsible for rendering
   * the PDF and uploading it to the `pdfs` bucket; this just records the
   * metadata + snapshot.
   */
  create: async (args: {
    inspectionId: string;
    templateId: string;
    pdfUrl: string;
    isSafeForUse: boolean | null;
    conclusionText: string | null;
    params?: Record<string, unknown>;
    pdf_hash?: string;
  }): Promise<Certificate> => {
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    return throwIfError<Certificate>(
      await supabase
        .from('certificates')
        .insert({
          inspection_id: args.inspectionId,
          user_id: user.id,
          template_id: args.templateId,
          pdf_url: args.pdfUrl,
          is_safe_for_use: args.isSafeForUse,
          conclusion_text: args.conclusionText,
          params: args.params ?? {},
          ...(args.pdf_hash ? { pdf_hash: args.pdf_hash } : {}),
        })
        .select()
        .single(),
    );
  },
  remove: async (id: string) => {
    // Read the pdf path first so we can delete the blob in the `pdfs`
    // bucket too - otherwise the file stays forever.
    const { data: existing } = await supabase
      .from('certificates')
      .select('pdf_url')
      .eq('id', id)
      .maybeSingle();
    const { error } = await supabase.from('certificates').delete().eq('id', id);
    if (error) throw error;
    const path = (existing as { pdf_url?: string } | null)?.pdf_url;
    if (path) {
      await supabase.storage
        .from('pdfs')
        .remove([path])
        .catch((e) => logError(e, 'certificates.removeBlob'));
    }
  },
};

export function isExpiringSoon(q: Qualification): boolean {
  if (!q.expires_at) return false;
  const exp = new Date(q.expires_at).getTime();
  return exp - Date.now() < 30 * 24 * 60 * 60 * 1000;
}
