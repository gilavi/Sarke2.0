import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listBriefings, topicLabel, type Briefing } from '@/lib/data/briefings';
import { listProjects, type Project } from '@/lib/data/projects';

export default function Briefings() {
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project') ?? '';

  const [items, setItems] = useState<Briefing[] | null>(null);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [error, setError] = useState<string | null>(null);

  const filtered = projectParam ? (items?.filter((b) => b.projectId === projectParam) ?? null) : items;

  useEffect(() => {
    Promise.all([listBriefings(), listProjects()])
      .then(([bs, ps]) => {
        setItems(bs);
        setProjects(Object.fromEntries(ps.map((p) => [p.id, p])));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        {projectParam && projects[projectParam] && (
          <Link to={`/projects/${projectParam}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
            ← {projects[projectParam].name}
          </Link>
        )}
        <h1 className="font-display text-3xl font-bold text-neutral-900">ბრიფინგები</h1>
        <p className="mt-1 text-sm text-neutral-500">უსაფრთხოების ბრიფინგების ისტორია.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!filtered && !error && <p className="text-sm text-neutral-500">იტვირთება…</p>}
      {filtered && filtered.length === 0 && (
        <p className="text-sm text-neutral-500">ბრიფინგები ვერ მოიძებნა.</p>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid gap-3">
          {filtered.map((b) => {
            const proj = projects[b.projectId];
            return (
              <Link key={b.id} to={`/briefings/${b.id}`}>
                <Card className="transition hover:border-brand-300 hover:shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>
                        {new Date(b.dateTime).toLocaleDateString('ka-GE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-xs font-normal text-neutral-500">{b.status}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-neutral-600">
                    <div>{proj?.name ?? '—'}</div>
                    {b.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {b.topics.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                          >
                            {topicLabel(t)}
                          </span>
                        ))}
                        {b.topics.length > 4 && (
                          <span className="text-xs text-neutral-500">
                            +{b.topics.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-neutral-500">
                      {b.participants.length} მონაწილე
                    </div>
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
