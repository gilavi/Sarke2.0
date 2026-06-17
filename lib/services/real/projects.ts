import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { supabase, STORAGE_BUCKETS, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../supabase';
import { compressPhoto } from '../../photoCompression';
import { logError } from '../../logError';
import { isProject } from '../../guards';
import type { Project, ProjectFile, ProjectSigner } from '../../../types/models';
import {
  assertLogoSize,
  mapCrew,
  throwIfError,
  throwIfErrorMaybe,
  withMappedCrew,
} from './_shared';

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
    companyName: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    logo?: string | null;
    contactPhone?: string | null;
  }): Promise<Project> => {
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    assertLogoSize(args.logo);
    return throwIfError<Project>(
      await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: args.name,
          company_name: args.companyName,
          address: args.address ?? null,
          latitude: args.latitude ?? null,
          longitude: args.longitude ?? null,
          logo: args.logo ?? null,
          contact_phone: args.contactPhone ?? null,
        })
        .select()
        .single(),
    );
  },
  update: async (
    id: string,
    patch: Partial<Pick<Project, 'name' | 'company_name' | 'address' | 'latitude' | 'longitude' | 'crew' | 'logo' | 'contact_phone'>>,
  ): Promise<Project> => {
    if ('logo' in patch) assertLogoSize(patch.logo);
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
    const { data, error } = await supabase.rpc('get_inspection_stats');
    if (error) throw error;
    const map: Record<string, { drafts: number; completed: number }> = {};
    for (const row of (data ?? []) as Array<{ project_id: string; drafts: number; completed: number }>) {
      map[row.project_id] = { drafts: Number(row.drafts), completed: Number(row.completed) };
    }
    return map;
  },
  // Per-project overdue counts for the projects-list badge. Backed by the
  // get_overdue_counts() RPC so the projects tab doesn't have to pull every
  // completed inspection + briefing + every template just to render badges.
  overdueCounts: async (): Promise<Record<string, number>> => {
    const { data, error } = await supabase.rpc('get_overdue_counts');
    if (error) throw error;
    const map: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ project_id: string; overdue_count: number }>) {
      map[row.project_id] = Number(row.overdue_count);
    }
    return map;
  },
};

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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    const fileId = Crypto.randomUUID();
    const safeName = args.name.replace(/[^\w.\-]+/g, '_').replace(/\.{2,}/g, '.').slice(0, 120) || 'file';
    const storagePath = `${args.projectId}/${fileId}-${safeName}`;
    const headers: Record<string, string> = {
      'Content-Type': args.mimeType || 'application/octet-stream',
      'x-upsert': 'true',
      apikey: SUPABASE_ANON_KEY,
    };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKETS.projectFiles}/${storagePath}`;

    // Compress images before upload
    let uploadUri = args.fileUri;
    if (args.mimeType?.startsWith('image/')) {
      try {
        const result = await compressPhoto(args.fileUri, { profile: 'document' });
        uploadUri = result.uri;
      } catch { /* fall back to original */ }
    }

    const result = await FileSystem.uploadAsync(url, uploadUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers,
    });
    // Clean up compressed temp file if different from original
    if (uploadUri !== args.fileUri) {
      FileSystem.deleteAsync(uploadUri, { idempotent: true }).catch(() => {});
    }
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
    // Delete the DB record first - if this throws, we leave storage untouched
    // so nothing is orphaned. Storage cleanup is best-effort after commit.
    const { error } = await supabase
      .from('project_files')
      .delete()
      .eq('id', file.id);
    if (error) throw error;
    await supabase.storage
      .from(STORAGE_BUCKETS.projectFiles)
      .remove([file.storage_path])
      .catch((e) => logError(e, 'projectFilesApi.remove.storage'));
  },
  signedUrl: async (file: ProjectFile, expiresIn = 3600): Promise<string> => {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.projectFiles)
      .createSignedUrl(file.storage_path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },
};
