import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import { INCIDENT_TYPE_LABEL, listIncidents } from '@/lib/data/incidents';
import { incidentKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { INCIDENT_TYPE_COLOR } from './_shared';

interface Props {
  projectId: string;
}

export function IncidentsSection({ projectId }: Props) {
  const { data: incidents = [] } = useQuery({
    queryKey: incidentKeys.list(projectId),
    queryFn: () => listIncidents(projectId),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          ინციდენტები
          <span className="ml-2 text-sm font-normal text-neutral-400">({incidents.length})</span>
        </CardTitle>
        <div className="flex items-center gap-3">
          <Link to={routes.incidents.new(projectId)}>
            <Button variant="outline" size="sm">
              <Plus size={14} className="mr-1" />
              ახალი
            </Button>
          </Link>
          {incidents.length > 5 && (
            <Link to={routes.incidents.list(projectId)} className="text-sm text-brand-600 hover:underline">
              ყველა →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {incidents.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-neutral-500 dark:text-neutral-400">ინციდენტები ჯერ არ არის.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {incidents.slice(0, 5).map((i) => (
              <li key={i.id}>
                <Link
                  to={routes.incidents.detail(i.id)}
                  className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-neutral-800 dark:text-neutral-200">
                      {i.injured_name || (i.type === 'nearmiss' ? 'საშიში შემთხვევა' : i.description)}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(i.date_time).toLocaleDateString('ka-GE')} · {i.location || '-'}
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
      </CardContent>
    </Card>
  );
}
