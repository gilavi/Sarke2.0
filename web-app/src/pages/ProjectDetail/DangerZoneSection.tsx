import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import DeleteButton from '@/components/DeleteButton';
import { deleteProject, type Project } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { humanizeError } from '@/lib/errors';

interface Props {
  project: Project;
  onError: (msg: string) => void;
}

export function DangerZoneSection({ project, onError }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(project.id),
    onSuccess: () => {
      qc.setQueryData<Project[]>(projectKeys.lists(), (prev) => (prev ?? []).filter((p) => p.id !== project.id));
      qc.removeQueries({ queryKey: projectKeys.detail(project.id) });
      navigate(routes.projects.list);
    },
    onError: (e) => onError(humanizeError(e)),
  });

  return (
    <section className="mt-4 border-t border-[var(--border-default)] pt-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-red-900 dark:text-red-300">პროექტის წაშლა</div>
            <div className="text-xs text-red-700 dark:text-red-400">
              ყველა შემოწმება, ინსტრუქტაჟი, ინციდენტი, რეპორტი და ფაილი წაიშლება.
            </div>
          </div>
          <div className="shrink-0">
            <DeleteButton
              label="პროექტის წაშლა"
              description="ყველა შემოწმება, ინსტრუქტაჟი, ინციდენტი, რეპორტი და ფაილი წაიშლება. ეს მოქმედება შეუქცევადია."
              onDelete={() => deleteMutation.mutate()}
              isPending={deleteMutation.isPending}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
