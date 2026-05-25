import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import { listReports, deleteReport, type Report } from '@/lib/data/reports';
import { listProjects } from '@/lib/data/projects';
import { reportDisplayName } from '@/lib/documentNames';
import { projectKeys, reportKeys } from '@/app/queryKeys';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

export default function Reports() {
  const qc = useQueryClient();
  const { data: items, error } = useQuery({ queryKey: reportKeys.lists(), queryFn: () => listReports() });
  const { data: projectList } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });
  const projects = projectList ? Object.fromEntries(projectList.map((p) => [p.id, p])) : {};

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.lists() }),
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
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {items.map((r) => {
            const proj = projects[r.project_id];
            const slideCount = r.slides?.length ?? 0;
            return (
              <motion.div
                key={r.id}
                variants={itemVariants}
                className="group flex items-center justify-between gap-3 px-6 py-4 hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/60"
              >
                <Link to={`/reports/${r.id}`} className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/20">
                    <span className="text-xl leading-none">📊</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {reportDisplayName(r.title)}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {proj?.name ?? '—'}
                      {' · '}
                      <span className="font-mono tabular-nums text-neutral-400 dark:text-neutral-500">
                        {new Date(r.created_at).toLocaleDateString('ka-GE')}
                      </span>
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {slideCount} სლაიდი
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  }`}>
                    {r.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Link to={`/reports/${r.id}`} className="rounded p-1 text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30">
                      <Pencil size={14} />
                    </Link>
                    <button
                      onClick={() => handleDelete(r)}
                      className="rounded p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
