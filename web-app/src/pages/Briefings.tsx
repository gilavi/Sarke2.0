import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import { ListRow, ListRowIcon } from '@/components/ListRow';
import StatusBadge from '@/components/StatusBadge';
import { listBriefings, topicLabel } from '@/lib/data/briefings';
import { listProjects } from '@/lib/data/projects';
import { fmtDateKa } from '@/lib/utils';

export default function Briefings() {
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project') ?? '';

  const { data: items, error } = useQuery({
    queryKey: ['briefings'],
    queryFn: () => listBriefings(),
  });
  const { data: projectList } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });

  const projects = projectList
    ? Object.fromEntries(projectList.map((p) => [p.id, p]))
    : {};
  const filtered = projectParam
    ? (items?.filter((b) => b.projectId === projectParam) ?? null)
    : (items ?? null);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          {projectParam && projects[projectParam] && (
            <Link to={`/projects/${projectParam}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
              ← {projects[projectParam].name}
            </Link>
          )}
          <h1 className="font-display text-3xl font-bold text-neutral-900">ბრიფინგები</h1>
          <p className="mt-1 text-sm text-neutral-500">უსაფრთხოების ბრიფინგების ისტორია.</p>
        </div>
        <Link to={`/briefings/new${projectParam ? `?project=${projectParam}` : ''}`}>
          <Button>+ ახალი ბრიფინგი</Button>
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {!filtered && !error && <SkeletonList />}
      {filtered && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">ბრიფინგები ჯერ არ გაქვთ.</p>
          <Link to="/briefings/new" className={buttonVariants({ size: 'sm' })}>+ ახალი ბრიფინგი</Link>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {filtered.map((b) => {
            const proj = projects[b.projectId];
            const topicsSummary = b.topics.slice(0, 3).map(topicLabel).join(', ')
              + (b.topics.length > 3 ? ` +${b.topics.length - 3}` : '');
            const subtitle = [proj?.name, topicsSummary].filter(Boolean).join(' · ');
            return (
              <ListRow
                key={b.id}
                to={`/briefings/${b.id}`}
                icon={<ListRowIcon icon={Users} color="bg-brand-50" iconColor="text-brand-600" />}
                title={fmtDateKa(b.dateTime)}
                subtitle={subtitle || undefined}
                trailing={`${b.participants.length} მონაწილე`}
                badge={<StatusBadge status={b.status} />}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
