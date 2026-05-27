import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateProjectLogo, type Project } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';

interface Props {
  project: Project;
  onEdit: () => void;
  editing: boolean;
  onError: (msg: string) => void;
}

export function ProjectHeader({ project, onEdit, editing, onError }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await updateProjectLogo(project.id, dataUrl);
      qc.setQueryData(projectKeys.detail(project.id), { ...project, logo: dataUrl });
      void qc.invalidateQueries({ queryKey: projectKeys.lists() });
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <header>
      <Link to={routes.projects.list} className="text-sm text-brand-600 hover:underline">
        ← პროექტები
      </Link>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            title="ლოგოს შეცვლა"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 transition hover:border-brand-400 disabled:opacity-60"
          >
            {project.logo ? (
              <img src={project.logo} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-bold text-neutral-400">
                {project.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
              <Upload size={16} className="text-white" />
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleLogoChange(e)}
          />
          <div>
            <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">{project.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">{project.company_name}</p>
          </div>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={onEdit} className="mt-1 shrink-0">
            <Pencil size={14} className="mr-1" />
            რედაქტირება
          </Button>
        )}
      </div>
    </header>
  );
}
