import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import DeleteButton from '@/components/DeleteButton';
import { Button, buttonVariants } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import { listBriefings, deleteBriefing, topicLabel } from '@/lib/data/briefings';
import { listProjects } from '@/lib/data/projects';
import { fmtDateKa } from '@/lib/utils';
import { projectKeys, briefingKeys } from '@/app/queryKeys';
import { ErrorMessage } from '@/components/ui/error-message';

const STATUS_LABEL: Record<string, string> = {
  draft: 'დრაფტი',
  completed: 'დასრულდა',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

export default function Briefings() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project') ?? '';

  const { data: items, error } = useQuery({ queryKey: briefingKeys.lists(), queryFn: () => listBriefings() });
  const { data: projectList } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });
  const projects = projectList ? Object.fromEntries(projectList.map((p) => [p.id, p])) : {};
  const filtered = projectParam ? (items?.filter((b) => b.projectId === projectParam) ?? null) : (items ?? null);

  const deleteMutation = useMutation({
    mutationFn: deleteBriefing,
    onSuccess: () => qc.invalidateQueries({ queryKey: briefingKeys.lists() }),
  });


  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          {projectParam && projects[projectParam] && (
            <Link to={`/projects/${projectParam}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
              ← {projects[projectParam].name}
            </Link>
          )}
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">ინსტრუქტაჟები</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">ინსტრუქტაჟების ისტორია.</p>
        </div>
        <Link to={`/briefings/new${projectParam ? `?project=${projectParam}` : ''}`}>
          <Button>+ ახალი ინსტრუქტაჟი</Button>
        </Link>
      </header>

      {error && (
        <ErrorMessage>{error instanceof Error ? error.message : String(error)}</ErrorMessage>
      )}

      {!filtered && !error && <SkeletonList />}

      {filtered && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">ინსტრუქტაჟები ჯერ არ გაქვთ.</p>
          <Link to="/briefings/new" className={buttonVariants({ size: 'sm' })}>+ ახალი ინსტრუქტაჟი</Link>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {filtered.map((b) => {
            const proj = projects[b.projectId];
            return (
              <motion.div
                key={b.id}
                variants={itemVariants}
                className="group flex items-center justify-between gap-3 px-6 py-4 hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/60"
              >
                <Link to={`/briefings/${b.id}`} className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/20">
                    <span className="text-xl leading-none">📋</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {b.topics.length > 0 ? topicLabel(b.topics[0]) : 'ინსტრუქტაჟი'}
                      {b.topics.length > 1 && (
                        <span className="ml-1.5 text-xs font-normal text-neutral-400">+{b.topics.length - 1}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {fmtDateKa(b.dateTime)}
                      {proj ? ` · ${proj.name}` : ''}
                      {' · '}
                      {b.participants.length} მონაწილე
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    b.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  }`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Link to={`/briefings/${b.id}`} className="rounded p-1 text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30">
                      <Pencil size={14} />
                    </Link>
                    <DeleteButton iconOnly onDelete={() => deleteMutation.mutate(b.id)} />
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
