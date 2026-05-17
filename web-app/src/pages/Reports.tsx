import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonList } from '@/components/SkeletonCard';
import { listReports, deleteReport, type Report } from '@/lib/data/reports';
import { listProjects } from '@/lib/data/projects';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

export default function Reports() {
  const qc = useQueryClient();
  const { data: items, error } = useQuery({
    queryKey: ['reports'],
    queryFn: () => listReports(),
  });
  const { data: projectList } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });
  const projects = projectList
    ? Object.fromEntries(projectList.map((p) => [p.id, p]))
    : {};

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });

  function handleDelete(item: Report) {
    const ok = window.confirm('წავშალოთ ეს რეპორტი?');
    if (!ok) return;
    deleteMutation.mutate(item);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">რეპორტები</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">სლაიდებიანი ფოტო-რეპორტები პროექტებზე.</p>
        </div>
        <Link to="/reports/new">
          <Button>+ ახალი რეპორტი</Button>
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}
      {!items && !error && <SkeletonList />}
      {items && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">რეპორტები ჯერ არ გაქვთ.</p>
          <Link to="/reports/new" className={buttonVariants({ size: 'sm' })}>+ ახალი რეპორტი</Link>
        </div>
      )}

      {items && items.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid gap-6">
          {items.map((r) => {
            const proj = projects[r.project_id];
            const slideCount = r.slides?.length ?? 0;
            return (
              <motion.div key={r.id} variants={itemVariants}>
                <Card className="group relative transition hover:border-brand-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <Link to={`/reports/${r.id}`} className="block">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-heading-3">
                      <span>{r.title || `რეპორტი #${r.id.slice(0, 8)}`}</span>
                      <span className="font-mono text-xs tabular-nums text-neutral-400 dark:text-neutral-500">{r.status === 'completed' ? 'დასრულებული' : 'დრაფტი'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-neutral-600 dark:text-neutral-400">
                    <div>{proj?.name ?? '—'}</div>
                    <div className="text-xs text-neutral-500">
                      {slideCount} სლაიდი ·{' '}
                      {new Date(r.created_at).toLocaleDateString('ka-GE')}
                    </div>
                  </CardContent>
                </Link>
                <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link to={`/reports/${r.id}`} className="rounded p-1 text-neutral-400 hover:text-brand-600 hover:bg-brand-50">
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(r)}
                    className="rounded p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
