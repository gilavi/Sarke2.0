import { supabase } from '@/lib/supabase';

export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  storage_path: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}

const BUCKET = 'project-files';

export async function listProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const { data, error } = await supabase
    .from('project_files')
    .select('id, project_id, name, storage_path, size_bytes, mime_type, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectFile[];
}

export async function signedFileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadProjectFile(
  projectId: string,
  userId: string,
  file: File,
): Promise<ProjectFile> {
  const path = `${userId}/${projectId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      name: file.name,
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type || null,
    })
    .select('id, project_id, name, storage_path, size_bytes, mime_type, created_at')
    .single();
  if (error) throw error;
  return data as ProjectFile;
}

export async function deleteProjectFile(file: ProjectFile): Promise<void> {
  await supabase.storage.from(BUCKET).remove([file.storage_path]);
  const { error } = await supabase.from('project_files').delete().eq('id', file.id);
  if (error) throw error;
}

export function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
