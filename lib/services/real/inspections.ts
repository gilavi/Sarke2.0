import * as Crypto from 'expo-crypto';
import { supabase, STORAGE_BUCKETS } from '../../supabase';
import { logError } from '../../logError';
import { isInspection } from '../../guards';
import type { Inspection, InspectionAttachment } from '../../../types/models';
import { throwIfError, throwIfErrorMaybe } from './_shared';
import { storageApi } from './storage';

export const inspectionsApi = {
  recent: async (limit = 100): Promise<Inspection[]> => {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
  getById: async (id: string): Promise<Inspection | null> => {
    return throwIfErrorMaybe<Inspection>(
      await supabase.from('inspections').select('*').eq('id', id).maybeSingle(),
      { guard: isInspection, context: 'inspectionsApi.getById' },
    );
  },
  listByProject: async (projectId: string): Promise<Inspection[]> => {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  create: async (args: {
    projectId: string;
    templateId: string;
    harnessName?: string;
    projectItemId?: string | null;
  }): Promise<Inspection> => {
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    return throwIfError<Inspection>(
      await supabase
        .from('inspections')
        .insert({
          project_id: args.projectId,
          template_id: args.templateId,
          user_id: user.id,
          status: 'draft',
          harness_name: args.harnessName ?? null,
          project_item_id: args.projectItemId ?? null,
        })
        .select()
        .single(),
    );
  },
  update: async (q: Partial<Inspection> & { id: string }): Promise<Inspection> => {
    return throwIfError<Inspection>(
      await supabase.from('inspections').update(q).eq('id', q.id).select().single(),
    );
  },
  /**
   * Flip status to `completed` without generating a PDF. The PDF (certificate)
   * is now a separate artefact created via `certificatesApi.generate()`.
   */
  finish: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('inspections')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
  remove: async (id: string) => {
    const { error } = await supabase.from('inspections').delete().eq('id', id);
    if (error) throw error;
  },
  counts: async (): Promise<{
    total: number;
    drafts: number;
    completed: number;
    latestCreatedAt: string | null;
  }> => {
    // Three parallel COUNT-only requests — no rows are transferred to the client.
    const [draftRes, completedRes, latestRes] = await Promise.all([
      supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('inspections').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (draftRes.error) throw draftRes.error;
    if (completedRes.error) throw completedRes.error;
    if (latestRes.error) throw latestRes.error;
    const drafts = draftRes.count ?? 0;
    const completed = completedRes.count ?? 0;
    return {
      total: drafts + completed,
      drafts,
      completed,
      latestCreatedAt: (latestRes.data as { created_at?: string } | null)?.created_at ?? null,
    };
  },
  listByTemplateIds: async (templateIds: string[]): Promise<Inspection[]> => {
    if (templateIds.length === 0) return [];
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .in('template_id', templateIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  listAll: async (): Promise<Inspection[]> => {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

/** @deprecated Use `inspectionsApi`. Re-exported so older imports still work. */
export const questionnairesApi = inspectionsApi;

// Inspection attachments (equipment certs uploaded per inspection).
//
// Distinct from `qualifications` (the expert's professional credentials)
// and `certificates` (generated PDFs). Each row attaches one equipment
// certificate (type chip + optional number + optional 16:9 photo) to one
// inspection. Photos live in the `certificates` storage bucket.

export const inspectionAttachmentsApi = {
  listByInspection: async (inspectionId: string): Promise<InspectionAttachment[]> => {
    const { data, error } = await supabase
      .from('inspection_attachments')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as InspectionAttachment[];
  },
  create: async (args: {
    inspectionId: string;
    certType: string;
    certNumber?: string | null;
    photoPath?: string | null;
  }): Promise<InspectionAttachment> => {
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    return throwIfError<InspectionAttachment>(
      await supabase
        .from('inspection_attachments')
        .insert({
          inspection_id: args.inspectionId,
          user_id: user.id,
          cert_type: args.certType,
          cert_number: args.certNumber ?? null,
          photo_path: args.photoPath ?? null,
        })
        .select()
        .single(),
    );
  },
  update: async (
    id: string,
    patch: { certType?: string; certNumber?: string | null; photoPath?: string | null },
  ): Promise<InspectionAttachment> => {
    const row: Record<string, unknown> = {};
    if (patch.certType !== undefined) row.cert_type = patch.certType;
    if (patch.certNumber !== undefined) row.cert_number = patch.certNumber;
    if (patch.photoPath !== undefined) row.photo_path = patch.photoPath;
    return throwIfError<InspectionAttachment>(
      await supabase
        .from('inspection_attachments')
        .update(row)
        .eq('id', id)
        .select()
        .single(),
    );
  },
  remove: async (id: string) => {
    // Best-effort: read photo_path first so the blob can be cleaned up too.
    const { data: existing } = await supabase
      .from('inspection_attachments')
      .select('photo_path')
      .eq('id', id)
      .maybeSingle();
    const { error } = await supabase
      .from('inspection_attachments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    const path = (existing as { photo_path?: string | null } | null)?.photo_path;
    if (path) {
      await supabase.storage
        .from(STORAGE_BUCKETS.certificates)
        .remove([path])
        .catch((e) => logError(e, 'inspection_attachments.removeBlob'));
    }
  },
  /**
   * Upload a 16:9 photo of the certificate to the `certificates` bucket.
   * Caller passes a local file URI (from expo-image-picker); the file is
   * compressed using the certificate profile before upload to keep PDFs lean.
   * Returns the bucket-relative storage path that should be saved on the row.
   */
  uploadPhoto: async (args: {
    inspectionId: string;
    fileUri: string;
  }): Promise<string> => {
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    const path = `${user.id}/${args.inspectionId}/${Crypto.randomUUID()}.jpg`;
    return storageApi.uploadFromUri(
      STORAGE_BUCKETS.certificates,
      path,
      args.fileUri,
      'image/jpeg',
      'certificate',
    );
  },
};
