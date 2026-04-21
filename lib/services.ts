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

const throwIfError = <T>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  if (res.data == null) throw new Error('No data');
  return res.data;
};

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
  create: async (args: { name: string; companyName?: string | null; address?: string | null }) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not signed in');
    return throwIfError(
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
  upsertSigner: async (signer: Partial<ProjectSigner> & { project_id: string; role: ProjectSigner['role']; full_name: string }) => {
    return throwIfError(
      await supabase
        .from('project_signers')
        .upsert(signer)
        .select()
        .single(),
    );
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
  listByProject: async (projectId: string): Promise<Questionnaire[]> => {
    const { data, error } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  create: async (args: { projectId: string; templateId: string; harnessName?: string }) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not signed in');
    return throwIfError(
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
  update: async (q: Partial<Questionnaire> & { id: string }) => {
    return throwIfError(
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
  upsert: async (a: Partial<Answer> & { questionnaire_id: string; question_id: string }) => {
    return throwIfError(
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
  addPhoto: async (answerId: string, storagePath: string, caption?: string) => {
    return throwIfError(
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
  upsert: async (s: Omit<SignatureRecord, 'id' | 'signed_at'> & { id?: string }) => {
    return throwIfError(
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
  upsert: async (c: Certificate) => {
    return throwIfError(
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
