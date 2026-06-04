import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { humanizeError } from '@/lib/errors';

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
      onError(humanizeError(e));
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
      onError(humanizeError(e));
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
      onError(humanizeError(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <Card className="overflow-hidden">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => void upload(e)}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          ფაილები
          <span className="ml-2 text-sm font-normal text-neutral-400">({files.length})</span>
        </CardTitle>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} className="mr-1" />
            {uploading ? 'იტვირთება…' : 'ატვირთვა'}
          </Button>
          {files.length > 5 && (
            <Link to={routes.projects.files(projectId)} className="text-sm text-brand-600 hover:underline">
              ყველა →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {files.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-neutral-500 dark:text-neutral-400">ფაილები ჯერ არ არის.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {files.slice(0, 5).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-neutral-800 dark:text-neutral-200">{f.name}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
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
      </CardContent>
    </Card>
  );
}
