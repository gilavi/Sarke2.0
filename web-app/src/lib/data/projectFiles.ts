import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKETS, signedUrl, upload, removeObjects } from '@/lib/db/storage';
import type { TablesInsert } from '@/types/database';

export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  storage_path: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}

export async function listProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const { data, error } = await supabase
    .from('project_files')
    .select('id, project_id, name, storage_path, size_bytes, mime_type, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectFile[];
}

export function signedFileUrl(path: string): Promise<string> {
  return signedUrl(STORAGE_BUCKETS.projectFiles, path);
}

export async function uploadProjectFile(
  projectId: string,
  userId: string,
  file: File,
): Promise<ProjectFile> {
  const path = `${userId}/${projectId}/${Date.now()}_${file.name}`;
  await upload(STORAGE_BUCKETS.projectFiles, path, file, { upsert: false });

  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      name: file.name,
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type || null,
    } as TablesInsert<'project_files'>)
    .select('id, project_id, name, storage_path, size_bytes, mime_type, created_at')
    .single();
  if (error) {
    // Roll back the just-uploaded file so a failed row insert doesn't orphan it.
    await removeObjects(STORAGE_BUCKETS.projectFiles, [path]);
    throw new Error(error.message);
  }
  return data as ProjectFile;
}

export async function deleteProjectFile(file: ProjectFile): Promise<void> {
  await removeObjects(STORAGE_BUCKETS.projectFiles, [file.storage_path]);
  const { error } = await supabase.from('project_files').delete().eq('id', file.id);
  if (error) throw new Error(error.message);
}

export function formatSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
