import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listProjectFiles, signedFileUrl, deleteProjectFile, formatSize, type ProjectFile } from '@/lib/data/projectFiles';
import { getProject } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { SkeletonList } from '@/components/SkeletonCard';
import { useState } from 'react';

export default function ProjectFiles() {
  const { id } = useParams();
  const [opening, setOpening] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject(id!),
    enabled: !!id,
  });
  const { data: files, isLoading } = useQuery({
    queryKey: projectKeys.files(id),
    queryFn: () => listProjectFiles(id!),
    enabled: !!id,
  });

  async function openFile(f: ProjectFile) {
    try {
      setOpening(f.id);
      const url = await signedFileUrl(f.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setOpening(null);
    }
  }

  async function handleDelete(f: ProjectFile) {
    const ok = window.confirm(`წავშალოთ "${f.name}"?`);
    if (!ok) return;
    setDeleting(f.id);
    try {
      await deleteProjectFile(f);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        {project && (
          <Link to={`/projects/${id}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
            ← {project.name}
          </Link>
        )}
        <h1 className="font-display text-3xl font-bold text-neutral-900 dark:text-neutral-100">ფაილები</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">პროექტის ფაილები.</p>
      </header>

      {isLoading && <SkeletonList />}

      {!isLoading && (!files || files.length === 0) && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">ფაილები ჯერ არ არის.</p>
        </div>
      )}

      {files && files.length > 0 && (
        <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
                  onClick={() => void openFile(f)}
                  disabled={opening === f.id}
                >
                  <Download size={14} className="mr-1" />
                  {opening === f.id ? 'იხსნება…' : 'გახსნა'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDelete(f)}
                  disabled={deleting === f.id}
                  className="text-red-600 hover:border-red-300 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
