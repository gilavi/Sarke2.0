import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DeleteButton from '@/components/DeleteButton';
import StatusBadge from '@/components/StatusBadge';
import { toastError } from '@/lib/errors';
import { getProject } from '@/lib/data/projects';
import { deleteReport, type Report } from '@/lib/data/reports';
import { projectKeys, reportKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { ReportPreview } from './ReportPreview';

/**
 * ReportView — the read-only page for a completed photo report: title /
 * project / date header with the status pill and a confirm-gated delete,
 * then the same slide sheets the live preview renders.
 */
export function ReportView({ report }: { report: Report }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: project } = useQuery({
    queryKey: projectKeys.detail(report.project_id),
    queryFn: () => getProject(report.project_id),
  });

  const del = useMutation({
    mutationFn: () => deleteReport(report),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportKeys.lists() });
      navigate(routes.history, { replace: true });
    },
    onError: toastError,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">
            {report.title || 'ფოტო-რეპორტი'}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span>
              {[project?.name, new Date(report.created_at).toLocaleDateString('ka-GE')]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <StatusBadge status={report.status} />
          </p>
        </div>
        <DeleteButton
          onDelete={() => del.mutate()}
          isPending={del.isPending}
          description="რეპორტი და მისი ფოტოები სამუდამოდ წაიშლება."
        />
      </header>

      <div className="flex justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 sm:p-6">
        <ReportPreview report={report} projectName={project?.name} />
      </div>
    </div>
  );
}
