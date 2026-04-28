import { supabase, STORAGE_BUCKETS, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import type {
  Answer,
  AnswerPhoto,
  Certificate,
  CrewMember,
  CrewRoleKey,
  Incident,
  Inspection,
  Project,
  ProjectFile,
  ProjectItem,
  ProjectSigner,
  Qualification,
  Question,
  RemoteSigningRequest,
  Schedule,
  ScheduleWithItem,
  SignatureRecord,
  SignerRole,
  Template,
} from '../types/models';
import { CREW_ROLE_KEYS, CREW_ROLE_LABEL } from '../types/models';
import * as Crypto from 'expo-crypto';
import { logError } from './logError';
import {
  isAnswer,
  isInspection,
  isProject,
  isQuestion,
  isTemplate,
} from './guards';

// Supabase boundary helpers. When a `guard` is supplied, schema drift throws
// here with a logged context instead of leaking undefined fields into the UI.
type SupabaseRes = { data: unknown; error: { message: string } | null };
type GuardOpts<T> = { guard?: (v: unknown) => v is T; context?: string };

function failShape(context: string): never {
  const err = new Error(`shape mismatch at ${context}`);
  logError(err, context);
  throw err;
}

function unwrap<T>(
  res: SupabaseRes,
  mode: 'required' | 'maybe' | 'list',
  opts?: GuardOpts<T>,
): T | T[] | null {
  if (res.error) throw new Error(res.error.message);
  const ctx = opts?.context ?? `unwrap.${mode}`;
  if (mode === 'list') {
    const rows = (res.data ?? []) as unknown[];
    if (opts?.guard) for (const row of rows) if (!opts.guard(row)) failShape(ctx);
    return rows as T[];
  }
  if (res.data == null) {
    if (mode === 'maybe') return null;
    throw new Error('No data');
  }
  if (opts?.guard && !opts.guard(res.data)) failShape(ctx);
  return res.data as T;
}

function throwIfError<T>(res: SupabaseRes, opts?: GuardOpts<T>): T {
  return unwrap<T>(res, 'required', opts) as T;
}

function throwIfErrorMaybe<T>(res: SupabaseRes, opts?: GuardOpts<T>): T | null {
  return unwrap<T>(res, 'maybe', opts) as T | null;
}

function listOrThrow<T>(res: SupabaseRes, opts?: GuardOpts<T>): T[] {
  return unwrap<T>(res, 'list', opts) as T[];
}

// -------- Projects --------

/**
 * Coerce stored crew rows into the current shape. Legacy rows (pre role-slot
 * UX) lack a `roleKey`; we route them into the `other` slot rather than
 * dropping them, and reuse their stored `role` string as the display label.
 * After coercion, callers must dedupe by `roleKey` themselves — the slot UI
 * keeps only the first match per slot.
 */
function mapCrew(rows: unknown): CrewMember[] {
  if (!Array.isArray(rows)) return [];
  const valid = new Set<CrewRoleKey>(CREW_ROLE_KEYS);
  return rows
    .map(r => {
      const row = (r ?? {}) as Partial<CrewMember> & Record<string, unknown>;
      const key: CrewRoleKey = valid.has(row.roleKey as CrewRoleKey)
        ? (row.roleKey as CrewRoleKey)
        : 'other';
      const role =
        typeof row.role === 'string' && row.role.trim().length > 0
          ? row.role
          : CREW_ROLE_LABEL[key];
      return {
        id: typeof row.id === 'string' ? row.id : `crew_${Math.random().toString(36).slice(2, 10)}`,
        roleKey: key,
        name: typeof row.name === 'string' ? row.name : '',
        role,
        signature: typeof row.signature === 'string' ? row.signature : null,
      } satisfies CrewMember;
    })
    .filter(m => m.name.length > 0);
}

function withMappedCrew(p: Project | null): Project | null {
  if (!p) return p;
  return { ...p, crew: mapCrew(p.crew) };
}

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(p => ({ ...(p as Project), crew: mapCrew((p as Project).crew) }));
  },
  getById: async (id: string): Promise<Project | null> => {
    const p = throwIfErrorMaybe<Project>(
      await supabase.from('projects').select('*').eq('id', id).maybeSingle(),
      { guard: isProject, context: 'projectsApi.getById' },
    );
    return withMappedCrew(p);
  },
  create: async (args: {
    name: string;
    companyName?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    logo?: string | null;
  }): Promise<Project> => {
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
          latitude: args.latitude ?? null,
          longitude: args.longitude ?? null,
          logo: args.logo ?? null,
        })
        .select()
        .single(),
    );
  },
  update: async (
    id: string,
    patch: Partial<Pick<Project, 'name' | 'company_name' | 'address' | 'latitude' | 'longitude' | 'crew' | 'logo'>>,
  ): Promise<Project> => {
    const updated = throwIfError<Project>(
      await supabase.from('projects').update(patch).eq('id', id).select().single(),
    );
    return { ...updated, crew: mapCrew(updated.crew) };
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
  // so it's reusable on the next inspection for this project.
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
      .from('inspections')
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

// -------- Project Files --------

export const projectFilesApi = {
  list: async (projectId: string): Promise<ProjectFile[]> => {
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProjectFile[];
  },
  upload: async (args: {
    projectId: string;
    fileUri: string;
    name: string;
    mimeType: string | null;
    sizeBytes: number | null;
  }): Promise<ProjectFile> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not signed in');
    const fileId = Crypto.randomUUID();
    const safeName = args.name.replace(/[^\w.\-]+/g, '_').replace(/\.{2,}/g, '.').slice(0, 120) || 'file';
    const storagePath = `${args.projectId}/${fileId}-${safeName}`;
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': args.mimeType || 'application/octet-stream',
      'x-upsert': 'true',
      apikey: SUPABASE_ANON_KEY,
    };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKETS.projectFiles}/${storagePath}`;
    const result = await FileSystem.uploadAsync(url, args.fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers,
    });
    if (result.status < 200 || result.status >= 300) {
      const err = new Error(`upload failed (${result.status}): ${result.body}`);
      logError(err, `projectFilesApi.upload status=${result.status} path=${storagePath} hasSession=${!!session?.access_token}`);
      throw err;
    }
    return throwIfError<ProjectFile>(
      await supabase
        .from('project_files')
        .insert({
          id: fileId,
          project_id: args.projectId,
          user_id: user.id,
          name: args.name,
          storage_path: storagePath,
          size_bytes: args.sizeBytes,
          mime_type: args.mimeType,
        })
        .select()
        .single(),
    );
  },
  remove: async (file: ProjectFile): Promise<void> => {
    await supabase.storage
      .from(STORAGE_BUCKETS.projectFiles)
      .remove([file.storage_path])
      .catch((e) => logError(e, 'projectFilesApi.remove.storage'));
    const { error } = await supabase
      .from('project_files')
      .delete()
      .eq('id', file.id);
    if (error) throw error;
  },
  signedUrl: async (file: ProjectFile, expiresIn = 3600): Promise<string> => {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.projectFiles)
      .createSignedUrl(file.storage_path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
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
    return throwIfErrorMaybe<Template>(
      await supabase.from('templates').select('*').eq('id', id).maybeSingle(),
      { guard: isTemplate, context: 'templatesApi.getById' },
    );
  },
  questions: async (templateId: string): Promise<Question[]> => {
    return listOrThrow<Question>(
      await supabase
        .from('questions')
        .select('*')
        .eq('template_id', templateId)
        .order('section')
        .order('order'),
      { guard: isQuestion, context: 'templatesApi.questions' },
    );
  },
};

// -------- Inspections --------
//
// Formerly `questionnairesApi`. The screens and offline queue still refer to
// "questionnaire" in some cache keys and route paths; those can be renamed
// piecemeal. At the domain/API boundary, we use `inspection` exclusively.

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
    const user = (await supabase.auth.getUser()).data.user;
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
    const { data, error } = await supabase
      .from('inspections')
      .select('status,created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    let drafts = 0;
    let completed = 0;
    for (const row of (data ?? []) as Array<{ status: string }>) {
      if (row.status === 'completed') completed += 1;
      else drafts += 1;
    }
    const latestCreatedAt = (data?.[0] as { created_at?: string } | undefined)?.created_at ?? null;
    return { total: (data?.length ?? 0), drafts, completed, latestCreatedAt };
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
};

/** @deprecated Use `inspectionsApi`. Re-exported so older imports still work. */
export const questionnairesApi = inspectionsApi;

// -------- Answers --------

export const answersApi = {
  list: async (inspectionId: string): Promise<Answer[]> => {
    return listOrThrow<Answer>(
      await supabase.from('answers').select('*').eq('inspection_id', inspectionId),
      { guard: isAnswer, context: 'answersApi.list' },
    );
  },
  upsert: async (a: Partial<Answer> & { inspection_id: string; question_id: string }): Promise<Answer> => {
    return throwIfError<Answer>(
      await supabase
        .from('answers')
        .upsert(a, { onConflict: 'inspection_id,question_id' })
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
  photosByAnswerIds: async (
    answerIds: string[],
  ): Promise<Record<string, AnswerPhoto[]>> => {
    if (answerIds.length === 0) return {};
    const { data, error } = await supabase
      .from('answer_photos')
      .select('*')
      .in('answer_id', answerIds);
    if (error) throw error;
    const out: Record<string, AnswerPhoto[]> = {};
    for (const p of (data ?? []) as AnswerPhoto[]) {
      (out[p.answer_id] ??= []).push(p);
    }
    return out;
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
  removePhoto: async (photoId: string) => {
    // Read the storage path first so we can also delete the blob in the
    // `answer-photos` bucket — otherwise deleting the row leaks the file.
    const { data: existing } = await supabase
      .from('answer_photos')
      .select('storage_path')
      .eq('id', photoId)
      .maybeSingle();
    const { error } = await supabase.from('answer_photos').delete().eq('id', photoId);
    if (error) throw error;
    const path = (existing as { storage_path?: string } | null)?.storage_path;
    if (path) {
      // Best-effort: don't fail the operation if the blob is already gone.
      await supabase.storage
        .from('answer-photos')
        .remove([path])
        .catch((e) => logError(e, 'answerPhotos.removeBlob'));
    }
  },
};

// -------- Signatures --------
//
// Scoped to `inspection_id` for now. Moving signatures onto certificates is
// part of the separate signature redesign.

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

// -------- Qualifications (expert's professional certificates) --------
//
// Formerly `certificatesApi`. Handles the xaracho_inspector / harness_inspector
// / … credentials the expert uploads to their profile — attached to generated
// PDFs as proof of qualification. Shape identical to the pre-0006 API.

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
    // placeholder user_ids — RLS would reject anyway, but overriding here
    // turns a silent 403 into a predictable insert. created_at is handled
    // by the table default when omitted.
    const user = (await supabase.auth.getUser()).data.user;
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

// -------- Certificates (generated PDFs) --------
//
// A certificate is a PDF derived from an inspection. One inspection : many
// certificates. Generation is explicit — callers pass a pre-rendered PDF path
// (already uploaded to Storage) plus a snapshot of the inspection payload, so
// the rendering concern stays in `lib/pdf.ts` + the screen that orchestrates
// signature capture. This keeps the API testable without a PDF backend.

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
   * badge without paying for full certificate rows.
   */
  countsByInspection: async (inspectionIds: string[]): Promise<Record<string, number>> => {
    if (inspectionIds.length === 0) return {};
    // Hard cap — list screens never need more than a few thousand cert
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
  }): Promise<Certificate> => {
    const user = (await supabase.auth.getUser()).data.user;
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
        })
        .select()
        .single(),
    );
  },
  remove: async (id: string) => {
    // Read the pdf path first so we can delete the blob in the `pdfs`
    // bucket too — otherwise the file stays forever.
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

// -------- Project items --------

export const projectItemsApi = {
  listByProject: async (projectId: string): Promise<ProjectItem[]> => {
    const { data, error } = await supabase
      .from('project_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  create: async (args: { projectId: string; name: string; category?: string | null }): Promise<ProjectItem> => {
    return throwIfError<ProjectItem>(
      await supabase
        .from('project_items')
        .insert({
          project_id: args.projectId,
          name: args.name,
          category: args.category ?? null,
        })
        .select()
        .single(),
    );
  },
  remove: async (id: string) => {
    const { error } = await supabase.from('project_items').delete().eq('id', id);
    if (error) throw error;
  },
};

// -------- Schedules --------

const SCHEDULE_JOIN =
  '*, project_items!inner(id, name, project_id, projects!inner(id, name, company_name))';

export const schedulesApi = {
  /** All schedules the current user can see (joined with item + project). */
  list: async (): Promise<ScheduleWithItem[]> => {
    const { data, error } = await supabase
      .from('schedules')
      .select(SCHEDULE_JOIN)
      .order('next_due_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ScheduleWithItem[];
  },
  /** Schedules with next_due_at falling between fromIso and toIso (inclusive). */
  upcoming: async (fromIso: string, toIso: string): Promise<ScheduleWithItem[]> => {
    const { data, error } = await supabase
      .from('schedules')
      .select(SCHEDULE_JOIN)
      .gte('next_due_at', fromIso)
      .lte('next_due_at', toIso)
      .order('next_due_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ScheduleWithItem[];
  },
  /** Manually mark an item as inspected now. Normally the DB trigger handles this. */
  markInspected: async (scheduleId: string, completedAtIso: string): Promise<Schedule> => {
    const existing = await supabase
      .from('schedules')
      .select('interval_days')
      .eq('id', scheduleId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    const intervalDays =
      ((existing.data as { interval_days?: number } | null)?.interval_days) ?? 10;
    const completed = new Date(completedAtIso);
    const next = new Date(completed.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    return throwIfError<Schedule>(
      await supabase
        .from('schedules')
        .update({
          last_inspected_at: completedAtIso,
          next_due_at: next.toISOString(),
        })
        .eq('id', scheduleId)
        .select()
        .single(),
    );
  },
  /** Ensure a schedules row exists for an item; default interval 10 days. */
  upsertForItem: async (projectItemId: string, intervalDays = 10): Promise<Schedule> => {
    const existing = await supabase
      .from('schedules')
      .select('*')
      .eq('project_item_id', projectItemId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return existing.data as Schedule;
    return throwIfError<Schedule>(
      await supabase
        .from('schedules')
        .insert({
          project_item_id: projectItemId,
          interval_days: intervalDays,
          next_due_at: new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single(),
    );
  },
  /** Persist the Google Calendar event id after a successful sync. */
  setGoogleEventId: async (scheduleId: string, googleEventId: string | null) => {
    const { error } = await supabase
      .from('schedules')
      .update({ google_event_id: googleEventId })
      .eq('id', scheduleId);
    if (error) throw error;
  },
};

// -------- Remote signing --------

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
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) throw new Error('not authenticated');

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
        expert_user_id: userData.user.id,
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
  /**
   * Upload a local file (file:// URI) directly to Supabase storage via the
   * REST endpoint, using `FileSystem.uploadAsync` so the bytes never pass
   * through the JS Blob/ArrayBuffer layer.
   *
   * Why this exists: on Hermes / Expo SDK 54, supabase-js's `.upload(blob)`
   * and `.upload(arrayBuffer)` both silently ship 0-byte objects to storage
   * (the Blob serialization for fetch's body is broken). Native upload
   * streams the file straight from disk and is the only path that
   * reliably stores the actual bytes.
   */
  uploadFromUri: async (
    bucket: string,
    path: string,
    fileUri: string,
    contentType: string,
  ): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'x-upsert': 'true',
      apikey: SUPABASE_ANON_KEY,
    };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
    const result = await FileSystem.uploadAsync(url, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers,
    });
    if (result.status < 200 || result.status >= 300) {
      const err = new Error(`storage upload failed (${result.status}): ${result.body}`);
      logError(err, `storage.uploadFromUri bucket=${bucket} path=${path} status=${result.status}`);
      throw err;
    }
    return path;
  },
  download: async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    return data;
  },
  signedUrl: async (bucket: string, path: string, expiresIn = 3600): Promise<string> => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },
  publicUrl: (bucket: string, path: string) =>
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
  /** Best-effort blob delete. Logs failures (file may already be gone) but never throws. */
  remove: async (bucket: string, path: string): Promise<void> => {
    await supabase.storage
      .from(bucket)
      .remove([path])
      .catch((e) => logError(e, `storage.remove.${bucket}`));
  },
};

// -------- Incidents --------

export const incidentsApi = {
  listByProject: async (projectId: string): Promise<Incident[]> => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Incident[];
  },

  getById: async (id: string): Promise<Incident | null> => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Incident | null) ?? null;
  },

  create: async (args: Omit<Incident, 'user_id' | 'created_at'>): Promise<Incident> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not signed in');
    return throwIfError<Incident>(
      await supabase
        .from('incidents')
        .insert({ ...args, user_id: user.id })
        .select()
        .single(),
    );
  },

  update: async (
    id: string,
    patch: Partial<Omit<Incident, 'id' | 'user_id' | 'project_id' | 'created_at'>>,
  ): Promise<Incident> => {
    return throwIfError<Incident>(
      await supabase.from('incidents').update(patch).eq('id', id).select().single(),
    );
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('incidents').delete().eq('id', id);
    if (error) throw error;
  },
};

// -------- Helpers --------

export function isExpiringSoon(q: Qualification): boolean {
  if (!q.expires_at) return false;
  const exp = new Date(q.expires_at).getTime();
  return exp - Date.now() < 30 * 24 * 60 * 60 * 1000;
}
