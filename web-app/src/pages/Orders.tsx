import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import { listOrders } from '@/lib/data/orders';
import { listProjects } from '@/lib/data/projects';
import { ORDER_DOCUMENT_TYPE_LABEL } from '@/lib/data/orders';
import { projectKeys, orderKeys } from '@/app/queryKeys';
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError } from '@/lib/errors';

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

export default function Orders() {
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project') ?? '';

  const { data: items, error } = useQuery({
    queryKey: orderKeys.lists(),
    queryFn: () => listOrders(),
  });
  const { data: projectList } = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: listProjects,
  });

  const projects = projectList
    ? Object.fromEntries(projectList.map((p) => [p.id, p]))
    : {};
  const filtered = projectParam
    ? (items?.filter((o) => o.projectId === projectParam) ?? null)
    : (items ?? null);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          {projectParam && projects[projectParam] && (
            <Link to={`/projects/${projectParam}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
              ← {projects[projectParam].name}
            </Link>
          )}
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">ბრძანებები</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">შრომის უსაფრთხოების ბრძანებები.</p>
        </div>
        <Link to={`/orders/new${projectParam ? `?project=${projectParam}` : ''}`}>
          <Button>+ ახალი ბრძანება</Button>
        </Link>
      </header>

      {error && (
        <ErrorMessage>{humanizeError(error)}</ErrorMessage>
      )}

      {!filtered && !error && <SkeletonList />}
      {filtered && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">ბრძანებები ჯერ არ გაქვთ.</p>
          <Button component={Link} to="/orders/new" size="sm">+ ახალი ბრძანება</Button>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {filtered.map((o) => {
            const proj = projects[o.projectId];
            const label = ORDER_DOCUMENT_TYPE_LABEL[o.documentType] ?? o.documentType;
            return (
              <motion.div key={o.id} variants={itemVariants}>
                <Link
                  to={`/orders/${o.id}`}
                  className="flex items-center gap-3 px-6 py-4 hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/20">
                    <span className="text-xl leading-none">📄</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {proj?.name ?? '-'}
                      {' · '}
                      {new Date(o.createdAt).toLocaleDateString('ka-GE')}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    o.status === 'completed'
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  }`}>
                    {o.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
