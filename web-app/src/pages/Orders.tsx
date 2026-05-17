import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import { listOrders } from '@/lib/data/orders';
import { listProjects } from '@/lib/data/projects';
import { ORDER_DOCUMENT_TYPE_LABEL } from '@/lib/data/orders';

export default function Orders() {
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project') ?? '';

  const { data: items, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => listOrders(),
  });
  const { data: projectList } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });

  const projects = projectList
    ? Object.fromEntries(projectList.map((p) => [p.id, p]))
    : {};
  const filtered = projectParam
    ? (items?.filter((o) => o.projectId === projectParam) ?? null)
    : (items ?? null);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          {projectParam && projects[projectParam] && (
            <Link to={`/projects/${projectParam}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
              ← {projects[projectParam].name}
            </Link>
          )}
          <h1 className="font-display text-3xl font-bold text-neutral-900 dark:text-neutral-100">ბრძანებები</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">შრომის უსაფრთხოების ბრძანებები.</p>
        </div>
        <Link to={`/orders/new${projectParam ? `?project=${projectParam}` : ''}`}>
          <Button>+ ახალი ბრძანება</Button>
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {!filtered && !error && <SkeletonList />}
      {filtered && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">ბრძანებები ჯერ არ გაქვთ.</p>
          <Link to="/orders/new" className={buttonVariants({ size: 'sm' })}>+ ახალი ბრძანება</Link>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid gap-3">
          {filtered.map((o) => {
            const proj = projects[o.projectId];
            const label = ORDER_DOCUMENT_TYPE_LABEL[o.documentType] ?? o.documentType;
            return (
              <Link key={o.id} to={`/orders/${o.id}`}>
                <Card className="transition hover:border-brand-300 hover:shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{label}</span>
                      <span className="text-xs font-normal text-neutral-500">{o.status === 'completed' ? 'დასრულებული' : 'დრაფტი'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-neutral-600">
                    <div>{proj?.name ?? '—'}</div>
                    <div className="text-xs text-neutral-500">
                      {new Date(o.createdAt).toLocaleDateString('ka-GE')}
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
