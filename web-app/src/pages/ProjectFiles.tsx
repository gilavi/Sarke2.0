import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import DeleteButton from '@/components/DeleteButton';
import { listProjectFiles, signedFileUrl, deleteProjectFile, formatSize, type ProjectFile } from '@/lib/data/projectFiles';
import { getProject } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { SkeletonList } from '@/components/SkeletonCard';
import { EmptyStateIllustration } from '@/components/EmptyStateIllustration';
import { useState } from 'react';
import { toastError } from '@/lib/errors';

export default function ProjectFiles() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [opening, setOpening] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: deleteProjectFile,
    onMutate: (f) => setDeletingId(f.id),
    onSuccess: () => { setDeletingId(null); qc.invalidateQueries({ queryKey: projectKeys.files(id) }); },
    onError: (e) => { setDeletingId(null); toastError(e); },
  });

  return (
    <div className="space-y-6">
      <header>
        {project && (
          <Link to={`/projects/${id}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
            ← {project.name}
          </Link>
        )}
        <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">ფაილები</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">პროექტის ფაილები.</p>
      </header>

      {isLoading && <SkeletonList />}

      {!isLoading && (!files || files.length === 0) && (
        <EmptyStateIllustration
          image="/ilu/cargo.png"
          title="ფაილები ჯერ არ არის"
          description="პროექტის ფაილები და დოკუმენტები აქ გამოჩნდება."
        />
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
                <DeleteButton
                  onDelete={() => deleteMutation.mutate(f)}
                  isPending={deletingId === f.id}
                  description={`"${f.name}" სამუდამოდ წაიშლება.`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
