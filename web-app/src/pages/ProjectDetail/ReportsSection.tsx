import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import DeleteButton from '@/components/DeleteButton';
import StatusBadge from '@/components/StatusBadge';
import { SkeletonList } from '@/components/SkeletonCard';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
import { ReportCoverThumb } from '@/features/reports/ReportCoverThumb';
import { deleteReport, listReports, type Report } from '@/lib/data/reports';
import { reportKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { humanizeError } from '@/lib/errors';

interface Props {
  projectId: string;
  onError: (msg: string) => void;
}

/**
 * The project's photo reports (რეპორტები): create CTA + ListRow stack with a
 * cover-photo thumbnail leading each row and a confirm-gated delete. Mirrors
 * OrdersSection.
 */
export function ReportsSection({ projectId, onError }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: reportKeys.list(projectId),
    queryFn: () => listReports(projectId),
  });

  const del = useMutation({
    mutationFn: (report: Report) => deleteReport(report),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.lists() }),
    onError: (e) => onError(humanizeError(e)),
  });

  return (
    <section>
      <SectionHeader
        title="რეპორტები"
        count={reports.length}
        trailing={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`${routes.reports.new}?project=${projectId}`)}
          >
            რეპორტი
          </Button>
        }
      />
      {isLoading ? (
        <SkeletonList count={2} />
      ) : reports.length === 0 ? (
        <p className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-6 text-sm text-[var(--text-muted)]">
          რეპორტები ჯერ არ არის.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          {reports.map((r) => (
            <ListRow
              key={r.id}
              leading={<ReportCoverThumb report={r} />}
              title={r.title || 'ფოტო-რეპორტი'}
              subtitle={new Date(r.created_at).toLocaleDateString('ka-GE')}
              trailing={<StatusBadge status={r.status} />}
              to={routes.reports.detail(r.id)}
              actions={
                <DeleteButton
                  iconOnly
                  onDelete={() => del.mutate(r)}
                  isPending={del.isPending && del.variables?.id === r.id}
                />
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
