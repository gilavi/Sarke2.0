import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  deleteProjectFile,
  formatSize,
  listProjectFiles,
  signedFileUrl,
  uploadProjectFile,
  type ProjectFile,
} from '@/lib/data/projectFiles';
import { projectKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { EmptyState, SectionHeader } from './_shared';

interface Props {
  projectId: string;
  onError: (msg: string) => void;
}

export function FilesSection({ projectId, onError }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: files = [] } = useQuery({
    queryKey: projectKeys.files(projectId),
    queryFn: () => listProjectFiles(projectId),
  });

  const [opening, setOpening] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function open(f: ProjectFile) {
    setOpening(f.id);
    try {
      const url = await signedFileUrl(f.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(null);
    }
  }

  async function remove(f: ProjectFile) {
    setDeleting(f.id);
    try {
      await deleteProjectFile(f);
      qc.setQueryData<ProjectFile[]>(projectKeys.files(projectId), (prev) =>
        (prev ?? []).filter((x) => x.id !== f.id),
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(null);
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const uploaded = await uploadProjectFile(projectId, user.id, file);
      qc.setQueryData<ProjectFile[]>(projectKeys.files(projectId), (prev) => [
        uploaded,
        ...(prev ?? []),
      ]);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <section>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => void upload(e)}
      />
      <SectionHeader
        title="ფაილები"
        count={files.length}
        viewAllTo={files.length > 5 ? routes.projects.files(projectId) : undefined}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} className="mr-1" />
            {uploading ? 'იტვირთება…' : 'ატვირთვა'}
          </Button>
        }
      />
      {files.length === 0 ? (
        <EmptyState text="ფაილები ჯერ არ არის." />
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {files.slice(0, 5).map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-neutral-800">{f.name}</div>
                <div className="text-xs text-neutral-500">
                  {formatSize(f.size_bytes)}
                  {f.mime_type ? ` · ${f.mime_type}` : ''}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void open(f)}
                  disabled={opening === f.id}
                >
                  <Download size={14} className="mr-1" />
                  {opening === f.id ? 'იხსნება…' : 'გახსნა'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void remove(f)}
                  disabled={deleting === f.id}
                  className="text-red-600 hover:border-red-300 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
