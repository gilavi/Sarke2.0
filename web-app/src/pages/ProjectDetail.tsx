import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProject, type Project } from '@/lib/data/projects';
import { listInspections, type Inspection } from '@/lib/data/inspections';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getProject(id), listInspections(id)])
      .then(([p, ins]) => {
        setProject(p);
        setInspections(ins);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (!project) return <p className="text-sm text-neutral-500">პროექტი ვერ მოიძებნა.</p>;

  return (
    <div className="space-y-6">
      <header>
        <Link to="/projects" className="text-sm text-brand-600 hover:underline">
          ← პროექტები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">{project.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">{project.company_name}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">დეტალები</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-neutral-700">
          <div>მისამართი: {project.address || '—'}</div>
          <div>ტელეფონი: {project.contact_phone || '—'}</div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">შემოწმების აქტები</h2>
        {inspections.length === 0 ? (
          <p className="text-sm text-neutral-500">აქტები ჯერ არ არის.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {inspections.map((i) => (
              <li key={i.id}>
                <Link
                  to={`/inspections/${i.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                >
                  <span className="text-sm text-neutral-800">{i.harness_name || i.id.slice(0, 8)}</span>
                  <span className="text-xs text-neutral-500">{i.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
