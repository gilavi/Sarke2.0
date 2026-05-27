import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import DeleteButton from '@/components/DeleteButton';
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

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(project.id),
    onSuccess: () => {
      qc.setQueryData<Project[]>(projectKeys.lists(), (prev) => (prev ?? []).filter((p) => p.id !== project.id));
      qc.removeQueries({ queryKey: projectKeys.detail(project.id) });
      navigate(routes.projects.list);
    },
    onError: (e) => onError(e instanceof Error ? e.message : String(e)),
  });

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
          <DeleteButton
            label="პროექტის წაშლა"
            description="ყველა შემოწმება, ინსტრუქტაჟი, ინციდენტი, რეპორტი და ფაილი წაიშლება. ეს მოქმედება შეუქცევადია."
            onDelete={() => deleteMutation.mutate()}
            isPending={deleteMutation.isPending}
          />
        </div>
      </div>
    </section>
  );
}
