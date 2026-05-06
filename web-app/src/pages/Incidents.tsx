import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  listIncidents,
  INCIDENT_TYPE_LABEL,
  type Incident,
} from '@/lib/data/incidents';
import { listProjects, type Project } from '@/lib/data/projects';

const TYPE_TONE: Record<string, string> = {
  fatal: 'bg-red-100 text-red-800',
  severe: 'bg-orange-100 text-orange-800',
  mass: 'bg-red-100 text-red-800',
  minor: 'bg-yellow-100 text-yellow-800',
  nearmiss: 'bg-neutral-100 text-neutral-700',
};

export default function Incidents() {
  const [items, setItems] = useState<Incident[] | null>(null);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listIncidents(), listProjects()])
      .then(([is, ps]) => {
        setItems(is);
        setProjects(Object.fromEntries(ps.map((p) => [p.id, p])));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">ინციდენტები</h1>
        <p className="mt-1 text-sm text-neutral-500">უბედური და საშიში შემთხვევების ჩანაწერები.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!items && !error && <p className="text-sm text-neutral-500">იტვირთება…</p>}
      {items && items.length === 0 && (
        <p className="text-sm text-neutral-500">ინციდენტები ვერ მოიძებნა.</p>
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
