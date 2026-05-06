import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listInspections } from '@/lib/data/inspections';
import { listProjects } from '@/lib/data/projects';

export default function Inspections() {
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project') ?? '';

  const { data: items, error: itemsError } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => listInspections(),
  });
  const { data: projectList } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });

  const projects = projectList
    ? Object.fromEntries(projectList.map((p) => [p.id, p]))
    : {};
  const [filter, setFilter] = useState<string>(projectParam);

  const filtered = items?.filter((i) => !filter || i.project_id === filter) ?? null;
  const error = itemsError;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          {filter && projects[filter] && (
            <Link to={`/projects/${filter}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
              ← {projects[filter].name}
            </Link>
          )}
          <h1 className="font-display text-3xl font-bold text-neutral-900">შემოწმების აქტები</h1>
          <p className="mt-1 text-sm text-neutral-500">ყველა აქტი თქვენი ანგარიშიდან.</p>
        </div>
        <Link to={`/inspections/new${filter ? `?project=${filter}` : ''}`}>
          <Button>+ ახალი აქტი</Button>
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {Object.keys(projects).length > 0 && (
        <div>
          <label className="mr-2 text-sm text-neutral-600">პროექტი:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">ყველა</option>
            {Object.values(projects).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!filtered && !error && <p className="text-sm text-neutral-500">იტვირთება…</p>}

      {filtered && filtered.length === 0 && (
        <p className="text-sm text-neutral-500">აქტები ვერ მოიძებნა.</p>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid gap-3">
          {filtered.map((i) => {
            const proj = projects[i.project_id];
            return (
              <Link key={i.id} to={`/inspections/${i.id}`}>
                <Card className="transition hover:border-brand-300 hover:shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {i.harness_name || `აქტი #${i.id.slice(0, 8)}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm text-neutral-600">
                    <span>{proj?.name ?? '—'}</span>
                    <span className="text-xs text-neutral-500">{i.status}</span>
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
