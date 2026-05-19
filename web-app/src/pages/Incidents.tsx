import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import { listIncidents, deleteIncident, INCIDENT_TYPE_LABEL, type Incident } from '@/lib/data/incidents';
import { listProjects } from '@/lib/data/projects';

const INCIDENT_AVATAR: Record<string, { emoji: string; bg: string }> = {
  fatal:    { emoji: '🚨', bg: 'bg-red-50 dark:bg-red-950/20' },
  severe:   { emoji: '⛑️', bg: 'bg-orange-50 dark:bg-orange-950/20' },
  mass:     { emoji: '🚨', bg: 'bg-red-50 dark:bg-red-950/20' },
  minor:    { emoji: '⚠️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  nearmiss: { emoji: '👁️', bg: 'bg-violet-50 dark:bg-violet-950/20' },
};

const INCIDENT_BADGE: Record<string, string> = {
  fatal:    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  severe:   'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  mass:     'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  minor:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  nearmiss: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

export default function Incidents() {
  const qc = useQueryClient();
  const { data: items, error } = useQuery({ queryKey: ['incidents'], queryFn: () => listIncidents() });
  const { data: projectList } = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const projects = projectList ? Object.fromEntries(projectList.map((p) => [p.id, p])) : {};

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
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {items.map((i) => {
            const proj = projects[i.project_id];
            const avatar = INCIDENT_AVATAR[i.type] ?? { emoji: '⚠️', bg: 'bg-neutral-100 dark:bg-neutral-800' };
            const label = i.injured_name || (i.type === 'nearmiss' ? 'საშიში შემთხვევა' : INCIDENT_TYPE_LABEL[i.type] ?? '—');
            return (
              <motion.div
                key={i.id}
                variants={itemVariants}
                className="group flex items-center justify-between gap-3 px-6 py-4 hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/60"
              >
                <Link to={`/incidents/${i.id}`} className="flex flex-1 items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${avatar.bg}`}>
                    <span className="text-xl leading-none">{avatar.emoji}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {proj?.name ?? '—'}
                      {' · '}
                      <span className="font-mono tabular-nums text-neutral-400 dark:text-neutral-500">
                        {new Date(i.date_time).toLocaleDateString('ka-GE')}
                      </span>
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INCIDENT_BADGE[i.type] ?? 'bg-neutral-100 text-neutral-600'}`}>
                    {INCIDENT_TYPE_LABEL[i.type] ?? i.type}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Link to={`/incidents/${i.id}`} className="rounded p-1 text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30">
                      <Pencil size={14} />
                    </Link>
                    <button
                      onClick={() => handleDelete(i)}
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
