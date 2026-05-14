import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import { ListRow, ListRowIcon } from '@/components/ListRow';
import { listIncidents, INCIDENT_TYPE_LABEL } from '@/lib/data/incidents';
import { listProjects } from '@/lib/data/projects';

const TYPE_ICON_COLOR: Record<string, string> = {
  fatal:    'bg-red-100',
  severe:   'bg-orange-100',
  mass:     'bg-red-100',
  minor:    'bg-yellow-100',
  nearmiss: 'bg-neutral-100',
};
const TYPE_TEXT_COLOR: Record<string, string> = {
  fatal:    'text-red-700',
  severe:   'text-orange-700',
  mass:     'text-red-700',
  minor:    'text-yellow-700',
  nearmiss: 'text-neutral-600',
};

export default function Incidents() {
  const { data: items, error } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => listIncidents(),
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
          <h1 className="font-display text-3xl font-bold text-neutral-900">ინციდენტები</h1>
          <p className="mt-1 text-sm text-neutral-500">უბედური და საშიში შემთხვევების ჩანაწერები.</p>
        </div>
        <Link to="/incidents/new">
          <Button>+ ახალი ინციდენტი</Button>
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
          <p className="text-sm text-neutral-500">ინციდენტები ჯერ არ გაქვთ.</p>
          <Link to="/incidents/new" className={buttonVariants({ size: 'sm' })}>+ ახალი ინციდენტი</Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {items.map((i) => {
            const proj = projects[i.project_id];
            const title = i.injured_name || (i.type === 'nearmiss' ? 'საშიში შემთხვევა' : '—');
            const dateStr = new Date(i.date_time).toLocaleDateString('ka-GE');
            const subtitle = [proj?.name, i.location, dateStr].filter(Boolean).join(' · ');
            const typeLabel = INCIDENT_TYPE_LABEL[i.type] ?? i.type;
            return (
              <ListRow
                key={i.id}
                to={`/incidents/${i.id}`}
                icon={
                  <ListRowIcon
                    icon={AlertTriangle}
                    color={TYPE_ICON_COLOR[i.type] ?? 'bg-neutral-100'}
                    iconColor={TYPE_TEXT_COLOR[i.type] ?? 'text-neutral-600'}
                  />
                }
                title={title}
                subtitle={subtitle || undefined}
                badge={
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      TYPE_ICON_COLOR[i.type] ?? 'bg-neutral-100'
                    } ${TYPE_TEXT_COLOR[i.type] ?? 'text-neutral-600'}`}
                  >
                    {typeLabel}
                  </span>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
