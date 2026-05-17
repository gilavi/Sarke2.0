import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonList } from '@/components/SkeletonCard';
import { listBriefings, deleteBriefing, topicLabel } from '@/lib/data/briefings';
import { listProjects } from '@/lib/data/projects';
import { fmtDateKa } from '@/lib/utils';

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

export default function Briefings() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project') ?? '';

  const { data: items, error } = useQuery({
    queryKey: ['briefings'],
    queryFn: () => listBriefings(),
  });
  const { data: projectList } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });

  const projects = projectList
    ? Object.fromEntries(projectList.map((p) => [p.id, p]))
    : {};
  const filtered = projectParam
    ? (items?.filter((b) => b.projectId === projectParam) ?? null)
    : (items ?? null);

  const deleteMutation = useMutation({
    mutationFn: deleteBriefing,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['briefings'] }),
  });

  function handleDelete(id: string) {
    const ok = window.confirm('წავშალოთ ეს ბრიფინგი?');
    if (!ok) return;
    deleteMutation.mutate(id);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          {projectParam && projects[projectParam] && (
            <Link to={`/projects/${projectParam}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
              ← {projects[projectParam].name}
            </Link>
          )}
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">ბრიფინგები</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">უსაფრთხოების ბრიფინგების ისტორია.</p>
        </div>
        <Link to={`/briefings/new${projectParam ? `?project=${projectParam}` : ''}`}>
          <Button>+ ახალი ბრიფინგი</Button>
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {!filtered && !error && <SkeletonList />}
      {filtered && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">ბრიფინგები ჯერ არ გაქვთ.</p>
          <Link to="/briefings/new" className={buttonVariants({ size: 'sm' })}>+ ახალი ბრიფინგი</Link>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid gap-6">
          {filtered.map((b) => {
            const proj = projects[b.projectId];
            return (
              <motion.div key={b.id} variants={itemVariants}>
                <Card className="group relative transition hover:border-brand-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <Link to={`/briefings/${b.id}`} className="block">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-heading-3">
                      <span>
                        {fmtDateKa(b.dateTime)}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-neutral-400 dark:text-neutral-500">{b.status === 'completed' ? 'დასრულებული' : 'დრაფტი'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
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
                </Link>
                <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link to={`/briefings/${b.id}`} className="rounded p-1 text-neutral-400 hover:text-brand-600 hover:bg-brand-50">
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(b.id)}
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
