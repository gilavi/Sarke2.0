import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import { listIncidents, INCIDENT_TYPE_LABEL } from '@/lib/data/incidents';
import { listProjects } from '@/lib/data/projects';

const TYPE_TONE: Record<string, string> = {
  fatal: 'bg-red-100 text-red-800',
  severe: 'bg-orange-100 text-orange-800',
  mass: 'bg-red-100 text-red-800',
  minor: 'bg-yellow-100 text-yellow-800',
  nearmiss: 'bg-neutral-100 text-neutral-700',
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
        <div className="grid gap-3">
          {items.map((i) => {
            const proj = projects[i.project_id];
            return (
              <Link key={i.id} to={`/incidents/${i.id}`}>
                <Card className="transition hover:border-brand-300 hover:shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            TYPE_TONE[i.type] ?? 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {INCIDENT_TYPE_LABEL[i.type] ?? i.type}
                        </span>
                        <span>{i.injured_name || (i.type === 'nearmiss' ? 'საშიში შემთხვევა' : '—')}</span>
                      </span>
                      <span className="text-xs font-normal text-neutral-500">
                        {new Date(i.date_time).toLocaleDateString('ka-GE')}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-neutral-600">
                    <div>{proj?.name ?? '—'}</div>
                    {i.location && <div className="text-xs text-neutral-500">{i.location}</div>}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
