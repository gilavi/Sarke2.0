import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { INCIDENT_TYPE_LABEL, listIncidents } from '@/lib/data/incidents';
import { incidentKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { EmptyState, INCIDENT_TYPE_COLOR, SectionHeader, listShellClass } from './_shared';

interface Props {
  projectId: string;
}

export function IncidentsSection({ projectId }: Props) {
  const { data: incidents = [] } = useQuery({
    queryKey: incidentKeys.list(projectId),
    queryFn: () => listIncidents(projectId),
  });

  return (
    <section>
      <SectionHeader
        title="ინციდენტები"
        count={incidents.length}
        viewAllTo={incidents.length > 5 ? routes.incidents.list(projectId) : undefined}
        action={
          <Link to={routes.incidents.new(projectId)}>
            <Button variant="outline" size="sm">
              <Plus size={14} className="mr-1" />
              ახალი
            </Button>
          </Link>
        }
      />
      {incidents.length === 0 ? (
        <EmptyState text="ინციდენტები ჯერ არ არის." />
      ) : (
        <ul className={listShellClass}>
          {incidents.slice(0, 5).map((i) => (
            <li key={i.id}>
              <Link
                to={routes.incidents.detail(i.id)}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-neutral-800">
                    {i.injured_name || (i.type === 'nearmiss' ? 'საშიში შემთხვევა' : i.description)}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {new Date(i.date_time).toLocaleDateString('ka-GE')} · {i.location || '—'}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      INCIDENT_TYPE_COLOR[i.type] ?? 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {INCIDENT_TYPE_LABEL[i.type] ?? i.type}
                  </span>
                  <StatusBadge status={i.status} showIcon={false} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
