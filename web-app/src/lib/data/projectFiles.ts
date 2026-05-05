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

export function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
