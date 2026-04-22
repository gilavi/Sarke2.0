import { supabase } from './supabase';
import type {
  Answer,
  AnswerPhoto,
  Certificate,
  Project,
  ProjectSigner,
  Question,
  Questionnaire,
  SignatureRecord,
  Template,
} from '../types/models';

/**
 * Narrow Supabase's wide `.select().single()` response to a concrete entity
 * shape the callers declared. We deliberately type-assert here so API
 * callers don't have to sprinkle `as unknown as T` at every call site.
 */
function throwIfError<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data == null) throw new Error('No data');
  return res.data as T;
}

// -------- Projects --------

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  getById: async (id: string): Promise<Project | null> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Project | null) ?? null;
  },
  create: async (args: { name: string; companyName?: string | null; address?: string | null }): Promise<Project> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not signed in');
    return throwIfError<Project>(
      await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: args.name,
          company_name: args.companyName ?? null,
          address: args.address ?? null,
        })
        .select()
        .single(),
    );
  },
  update: async (id: string, patch: Partial<Pick<Project, 'name' | 'company_name' | 'address'>>): Promise<Project> => {
    return throwIfError<Project>(
      await supabase.from('projects').update(patch).eq('id', id).select().single(),
    );
  },
  remove: async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },
  signers: async (projectId: string): Promise<ProjectSigner[]> => {
    const { data, error } = await supabase
      .from('project_signers')
      .select('*')
      .eq('project_id', projectId);
    if (error) throw error;
    return data ?? [];
  },
  upsertSigner: async (signer: Partial<ProjectSigner> & { project_id: string; role: ProjectSigner['role']; full_name: string }): Promise<ProjectSigner> => {
    return throwIfError<ProjectSigner>(
      await supabase
        .from('project_signers')
        .upsert(signer)
        .select()
        .single(),
    );
  },
  // Persist a drawn signature onto the roster entry (matched by project+role+name)
  // so it's reusable on the next questionnaire for this project.
  saveRosterSignature: async (args: {
    project_id: string;
    role: ProjectSigner['role'];
    full_name: string;
    phone?: string | null;
    position?: string | null;
    signature_png_url: string;
  }): Promise<ProjectSigner> => {
    const found = await supabase
      .from('project_signers')
      .select('*')
      .eq('project_id', args.project_id)
      .eq('role', args.role)
      .eq('full_name', args.full_name)
      .maybeSingle();
    if (found.error) throw found.error;
    if (found.data) {
      const patch: Partial<ProjectSigner> = { signature_png_url: args.signature_png_url };
      if (args.phone !== undefined) patch.phone = args.phone;
      if (args.position !== undefined) patch.position = args.position;
      return throwIfError<ProjectSigner>(
        await supabase
          .from('project_signers')
          .update(patch)
          .eq('id', (found.data as ProjectSigner).id)
          .select()
          .single(),
      );
    }
    return throwIfError<ProjectSigner>(
      await supabase
        .from('project_signers')
        .insert({
          project_id: args.project_id,
          role: args.role,
          full_name: args.full_name,
          phone: args.phone ?? null,
          position: args.position ?? null,
          signature_png_url: args.signature_png_url,
        })
        .select()
        .single(),
    );
  },
  deleteSigner: async (id: string) => {
    const { error } = await supabase.from('project_signers').delete().eq('id', id);
    if (error) throw error;
  },
  stats: async (): Promise<Record<string, { drafts: number; completed: number }>> => {
    const { data, error } = await supabase
      .from('questionnaires')
      .select('project_id,status');
    if (error) throw error;
    const map: Record<string, { drafts: number; completed: number }> = {};
    for (const row of (data ?? []) as Array<{ project_id: string; status: string }>) {
      const s = (map[row.project_id] ??= { drafts: 0, completed: 0 });
      if (row.status === 'completed') s.completed += 1;
      else s.drafts += 1;
    }
    return map;
  },
};

// -------- Templates --------

export const templatesApi = {
  list: async (): Promise<Template[]> => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('is_system', { ascending: false })
      .order('created_at');
    if (error) throw error;
    return data ?? [];
  },
  getById: async (id: string): Promise<Template | null> => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Template | null) ?? null;
  },
  questions: async (templateId: string): Promise<Question[]> => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('template_id', templateId)
      .order('section')
      .order('order');
    if (error) throw error;
    return data ?? [];
  },
};

// -------- Questionnaires --------

export const questionnairesApi = {
  recent: async (limit = 100): Promise<Questionnaire[]> => {
    const { data, error } = await supabase
      .from('questionnaires')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
  getById: async (id: string): Promise<Questionnaire | null> => {
    const { data, error } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Questionnaire | null) ?? null;
  },
  listByProject: async (projectId: string): Promise<Questionnaire[]> => {
    const { data, error } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  create: async (args: { projectId: string; templateId: string; harnessName?: string }): Promise<Questionnaire> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not signed in');
    return throwIfError<Questionnaire>(
      await supabase
        .from('questionnaires')
        .insert({
          project_id: args.projectId,
          template_id: args.templateId,
          user_id: user.id,
          status: 'draft',
          harness_name: args.harnessName ?? null,
        })
        .select()
        .single(),
    );
  },
  update: async (q: Partial<Questionnaire> & { id: string }): Promise<Questionnaire> => {
    return throwIfError<Questionnaire>(
      await supabase.from('questionnaires').update(q).eq('id', q.id).select().single(),
    );
  },
  complete: async (id: string, pdfUrl: string) => {
    const { error } = await supabase
      .from('questionnaires')
      .update({ status: 'completed', pdf_url: pdfUrl, completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
  remove: async (id: string) => {
    const { error } = await supabase.from('questionnaires').delete().eq('id', id);
    if (error) throw error;
  },
};

// -------- Answers --------

export const answersApi = {
  list: async (questionnaireId: string): Promise<Answer[]> => {
    const { data, error } = await supabase
      .from('answers')
      .select('*')
      .eq('questionnaire_id', questionnaireId);
    if (error) throw error;
    return data ?? [];
  },
  upsert: async (a: Partial<Answer> & { questionnaire_id: string; question_id: string }): Promise<Answer> => {
    return throwIfError<Answer>(
      await supabase
        .from('answers')
        .upsert(a, { onConflict: 'questionnaire_id,question_id' })
        .select()
        .single(),
    );
  },
  photos: async (answerId: string): Promise<AnswerPhoto[]> => {
    const { data, error } = await supabase
      .from('answer_photos')
      .select('*')
      .eq('answer_id', answerId);
    if (error) throw error;
    return data ?? [];
  },
  addPhoto: async (answerId: string, storagePath: string, caption?: string): Promise<AnswerPhoto> => {
    return throwIfError<AnswerPhoto>(
      await supabase
        .from('answer_photos')
        .insert({ answer_id: answerId, storage_path: storagePath, caption: caption ?? null })
        .select()
        .single(),
    );
  },
};

// -------- Signatures --------

export const signaturesApi = {
  list: async (questionnaireId: string): Promise<SignatureRecord[]> => {
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('questionnaire_id', questionnaireId);
    if (error) throw error;
    return data ?? [];
  },
  upsert: async (s: Omit<SignatureRecord, 'id' | 'signed_at'> & { id?: string }): Promise<SignatureRecord> => {
    return throwIfError<SignatureRecord>(
      await supabase
        .from('signatures')
        .upsert(
          { ...s, signed_at: new Date().toISOString() },
          { onConflict: 'questionnaire_id,signer_role' },
        )
        .select()
        .single(),
    );
  },
  remove: async (questionnaireId: string, role: SignatureRecord['signer_role']) => {
    const { error } = await supabase
      .from('signatures')
      .delete()
      .eq('questionnaire_id', questionnaireId)
      .eq('signer_role', role);
    if (error) throw error;
  },
};

// -------- Certificates --------

export const certificatesApi = {
  list: async (): Promise<Certificate[]> => {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  upsert: async (c: Certificate): Promise<Certificate> => {
    return throwIfError<Certificate>(
      await supabase.from('certificates').upsert(c).select().single(),
    );
  },
  remove: async (id: string) => {
    const { error } = await supabase.from('certificates').delete().eq('id', id);
    if (error) throw error;
  },
};

// -------- Storage --------

export const storageApi = {
  upload: async (bucket: string, path: string, body: Blob | ArrayBuffer, contentType: string) => {
    const { error } = await supabase.storage.from(bucket).upload(path, body, {
      contentType,
      upsert: true,
    });
    if (error) throw error;
    return path;
  },
  download: async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    return data;
  },
  publicUrl: (bucket: string, path: string) =>
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
};

// -------- Helpers --------

export function isExpiringSoon(cert: Certificate): boolean {
  if (!cert.expires_at) return false;
  const exp = new Date(cert.expires_at).getTime();
  return exp - Date.now() < 30 * 24 * 60 * 60 * 1000;
}
