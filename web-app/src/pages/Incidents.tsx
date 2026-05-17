import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonList } from '@/components/SkeletonCard';
import { listIncidents, deleteIncident, INCIDENT_TYPE_LABEL, type Incident } from '@/lib/data/incidents';
import { listProjects } from '@/lib/data/projects';

const TYPE_ICON_COLOR: Record<string, string> = {
  fatal:    'bg-red-100',
  severe:   'bg-orange-100',
  mass:     'bg-red-100',
  minor:    'bg-yellow-100',
  nearmiss: 'bg-neutral-100',
};
const TYPE_TEXT_COLOR: Record<string, string> = {
  fatal:    'text-red-700',
  severe:   'text-orange-700',
  mass:     'text-red-700',
  minor:    'text-yellow-700',
  nearmiss: 'text-neutral-600',
};

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

export default function Incidents() {
  const qc = useQueryClient();
  const { data: items, error } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => listIncidents(),
  });
  const { data: projectList } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });
  const projects = projectList
    ? Object.fromEntries(projectList.map((p) => [p.id, p]))
    : {};

  const deleteMutation = useMutation({
    mutationFn: deleteIncident,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });

  function handleDelete(item: Incident) {
    const ok = window.confirm('წავშალოთ ეს ინციდენტი?');
    if (!ok) return;
    deleteMutation.mutate(item);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">ინციდენტები</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">უბედური და საშიში შემთხვევების ჩანაწერები.</p>
        </div>
        <Link to="/incidents/new">
          <Button>+ ახალი ინციდენტი</Button>
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
          <p className="text-sm text-neutral-500">ინციდენტები ჯერ არ გაქვთ.</p>
          <Link to="/incidents/new" className={buttonVariants({ size: 'sm' })}>+ ახალი ინციდენტი</Link>
        </div>
      )}

      {items && items.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid gap-6">
          {items.map((i) => {
            const proj = projects[i.project_id];
            return (
              <motion.div key={i.id} variants={itemVariants}>
                <Card className="group relative transition hover:border-brand-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <Link to={`/incidents/${i.id}`} className="block">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-heading-3">
                      <span className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            TYPE_ICON_COLOR[i.type] ?? 'bg-neutral-100'
                          } ${TYPE_TEXT_COLOR[i.type] ?? 'text-neutral-600'}`}
                        >
                          {INCIDENT_TYPE_LABEL[i.type] ?? i.type}
                        </span>
                        <span>{i.injured_name || (i.type === 'nearmiss' ? 'საშიში შემთხვევა' : '—')}</span>
                      </span>
                      <span className="font-mono text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                        {new Date(i.date_time).toLocaleDateString('ka-GE')}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                    <div>{proj?.name ?? '—'}</div>
                    {i.location && <div className="text-xs text-neutral-500">{i.location}</div>}
                  </CardContent>
                </Link>
                <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link to={`/incidents/${i.id}`} className="rounded p-1 text-neutral-400 hover:text-brand-600 hover:bg-brand-50">
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(i)}
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
