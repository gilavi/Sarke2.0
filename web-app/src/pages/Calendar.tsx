import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listInspections, type Inspection } from '@/lib/data/inspections';
import { listProjects, type Project } from '@/lib/data/projects';

interface MonthBucket {
  key: string;
  label: string;
  items: Array<{ inspection: Inspection; project: Project | undefined; date: Date }>;
}

const MONTH_NAMES = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
];

function bucketize(inspections: Inspection[], projects: Map<string, Project>): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  for (const i of inspections) {
    if (i.status !== 'completed' || !i.completed_at) continue;
    const date = new Date(i.completed_at);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    if (!map.has(key)) map.set(key, { key, label, items: [] });
    map.get(key)!.items.push({ inspection: i, project: projects.get(i.project_id), date });
  }
  const buckets = [...map.values()];
  buckets.sort((a, b) => (a.key < b.key ? 1 : -1));
  for (const b of buckets) b.items.sort((a, c) => c.date.getTime() - a.date.getTime());
  return buckets;
}

export default function Calendar() {
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listInspections(), listProjects()])
      .then(([ins, ps]) => {
        setInspections(ins);
        setProjects(ps);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const buckets = useMemo(() => {
    if (!inspections) return null;
    return bucketize(inspections, new Map(projects.map((p) => [p.id, p])));
  }, [inspections, projects]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">კალენდარი</h1>
        <p className="mt-1 text-sm text-neutral-500">დასრულებული შემოწმებების ისტორია თარიღების მიხედვით.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!buckets && !error && <p className="text-sm text-neutral-500">იტვირთება…</p>}

      {buckets && buckets.length === 0 && (
        <p className="text-sm text-neutral-500">დასრულებული აქტები ჯერ არ არის.</p>
      )}

      {buckets &&
        buckets.map((b) => (
          <section key={b.key}>
            <h2 className="mb-3 font-display text-lg font-semibold text-neutral-700">{b.label}</h2>
            <div className="grid gap-2">
              {b.items.map(({ inspection, project, date }) => (
                <Link key={inspection.id} to={`/inspections/${inspection.id}`}>
                  <Card className="transition hover:border-brand-300 hover:shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{inspection.harness_name || `აქტი #${inspection.id.slice(0, 8)}`}</span>
                        <span className="text-xs font-normal text-neutral-500">
                          {date.toLocaleDateString('ka-GE', { day: '2-digit', month: 'short' })}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-neutral-600">
                      {project?.name ?? '—'}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
