import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { listReports } from '@/lib/data/reports';
import { reportKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { EmptyState, SectionHeader, listShellClass, rowClass } from './_shared';

interface Props {
  projectId: string;
}

export function ReportsSection({ projectId }: Props) {
  const { data: reports = [] } = useQuery({
    queryKey: reportKeys.list(projectId),
    queryFn: () => listReports(projectId),
  });

  return (
    <section>
      <SectionHeader
        title="რეპორტები"
        count={reports.length}
        viewAllTo={reports.length > 5 ? routes.reports.list(projectId) : undefined}
        action={
          <Link to={routes.reports.new(projectId)}>
            <Button variant="outline" size="sm">
              <Plus size={14} className="mr-1" />
              ახალი
            </Button>
          </Link>
        }
      />
      {reports.length === 0 ? (
        <EmptyState text="რეპორტები ჯერ არ არის." />
      ) : (
        <ul className={listShellClass}>
          {reports.slice(0, 5).map((r) => (
            <li key={r.id}>
              <Link to={routes.reports.detail(r.id)} className={rowClass}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-neutral-800">
                    {r.title || `რეპორტი #${r.id.slice(0, 8)}`}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {r.slides?.length ?? 0} სლაიდი ·{' '}
                    {new Date(r.created_at).toLocaleDateString('ka-GE')}
                  </span>
                </div>
                <StatusBadge status={r.status} showIcon={false} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
