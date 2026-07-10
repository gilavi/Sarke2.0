import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { InspectionTypeIcon } from '@/components/InspectionTypeIcon';
import StatusBadge from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/SkeletonCard';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
import { useActRows } from '@/lib/data/recordRows';
import { listProjects } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';

const FEED_SIZE = 6;

/**
 * Home "ბოლო ჩანაწერები" feed — the 6 newest inspection acts across all
 * projects (via useActRows), rendered as canonical ListRows inside one
 * bordered card. Links out to History for the full list.
 */
export function RecentRecordsFeed() {
  const { rows, isLoading } = useActRows();
  const { data: projects } = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: listProjects,
    staleTime: 1000 * 60 * 5,
  });

  const projectName = (id: string | null): string | null =>
    (id && projects?.find((p) => p.id === id)?.name) || null;

  const visible = rows.slice(0, FEED_SIZE);

  return (
    <section>
      <SectionHeader
        title="ბოლო ჩანაწერები"
        count={rows.length || undefined}
        to="/history"
        linkLabel="ისტორია"
      />
      {isLoading ? (
        <SkeletonList count={3} />
      ) : visible.length === 0 ? (
        <EmptyState icon={FileText} title="ჩანაწერები არ არის" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          {visible.map((row) => {
            const name = projectName(row.projectId);
            const date = row.date ? new Date(row.date).toLocaleDateString('ka-GE') : '';
            return (
              <ListRow
                key={row.id}
                leading={<InspectionTypeIcon type={row.type} size="md" />}
                title={row.label}
                subtitle={[name, date].filter(Boolean).join(' · ')}
                trailing={<StatusBadge status={row.status} />}
                to={row.href}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
