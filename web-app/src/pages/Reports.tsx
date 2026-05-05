import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listReports, type Report } from '@/lib/data/reports';
import { listProjects, type Project } from '@/lib/data/projects';

export default function Reports() {
  const [items, setItems] = useState<Report[] | null>(null);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listReports(), listProjects()])
      .then(([rs, ps]) => {
        setItems(rs);
        setProjects(Object.fromEntries(ps.map((p) => [p.id, p])));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">რეპორტები</h1>
        <p className="mt-1 text-sm text-neutral-500">სლაიდებიანი ფოტო-რეპორტები პროექტებზე.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {!items && !error && <p className="text-sm text-neutral-500">იტვირთება…</p>}
      {items && items.length === 0 && (
        <p className="text-sm text-neutral-500">რეპორტები ვერ მოიძებნა.</p>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((r) => {
            const proj = projects[r.project_id];
            const slideCount = r.slides?.length ?? 0;
            return (
              <Link key={r.id} to={`/reports/${r.id}`}>
                <Card className="transition hover:border-brand-300 hover:shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{r.title || `რეპორტი #${r.id.slice(0, 8)}`}</span>
                      <span className="text-xs font-normal text-neutral-500">{r.status}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-neutral-600">
                    <div>{proj?.name ?? '—'}</div>
                    <div className="text-xs text-neutral-500">
                      {slideCount} სლაიდი ·{' '}
                      {new Date(r.created_at).toLocaleDateString('ka-GE')}
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
