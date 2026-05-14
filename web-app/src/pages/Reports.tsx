import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import { ListRow, ListRowIcon } from '@/components/ListRow';
import StatusBadge from '@/components/StatusBadge';
import { listReports } from '@/lib/data/reports';
import { listProjects } from '@/lib/data/projects';

export default function Reports() {
  const { data: items, error } = useQuery({
    queryKey: ['reports'],
    queryFn: () => listReports(),
  });
  const { data: projectList } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });
  const projects = projectList
    ? Object.fromEntries(projectList.map((p) => [p.id, p]))
    : {};

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-neutral-900">რეპორტები</h1>
          <p className="mt-1 text-sm text-neutral-500">სლაიდებიანი ფოტო-რეპორტები პროექტებზე.</p>
        </div>
        <Link to="/reports/new">
          <Button>+ ახალი რეპორტი</Button>
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}
      {!items && !error && <SkeletonList />}
      {items && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">რეპორტები ჯერ არ გაქვთ.</p>
          <Link to="/reports/new" className={buttonVariants({ size: 'sm' })}>+ ახალი რეპორტი</Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {items.map((r) => {
            const proj = projects[r.project_id];
            const slideCount = r.slides?.length ?? 0;
            const dateStr = new Date(r.created_at).toLocaleDateString('ka-GE');
            const subtitle = [proj?.name, `${slideCount} სლაიდი`, dateStr].filter(Boolean).join(' · ');
            return (
              <ListRow
                key={r.id}
                to={`/reports/${r.id}`}
                icon={<ListRowIcon icon={FileText} color="bg-neutral-100" iconColor="text-neutral-600" />}
                title={r.title || `რეპორტი #${r.id.slice(0, 8)}`}
                subtitle={subtitle}
                badge={<StatusBadge status={r.status} />}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
