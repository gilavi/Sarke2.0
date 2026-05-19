import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteProject, type Project } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';

interface Props {
  project: Project;
  onError: (msg: string) => void;
}

export function DangerZoneSection({ project, onError }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const ok = window.confirm(
      `წაშლა: "${project.name}"\n\n` +
        `ყველა ინსპექცია, ინსტრუქტაჟი, ინციდენტი, რეპორტი და ფაილი წაიშლება. ეს მოქმედება უკან არ ბრუნდება.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      qc.setQueryData<Project[]>(projectKeys.lists(), (prev) =>
        (prev ?? []).filter((p) => p.id !== project.id),
      );
      qc.removeQueries({ queryKey: projectKeys.detail(project.id) });
      navigate(routes.projects.list);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  }

  return (
    <section className="pt-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-red-900">პროექტის წაშლა</div>
            <div className="text-xs text-red-700">
              ყველა შემოწმება, ინსტრუქტაჟი, ინციდენტი, რეპორტი და ფაილი წაიშლება.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="text-red-700 hover:border-red-400 hover:bg-red-100"
          >
            <Trash2 size={14} className="mr-1" />
            {deleting ? 'იშლება…' : 'პროექტის წაშლა'}
          </Button>
        </div>
      </div>
    </section>
  );
}
