import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { listProjects, type Project } from '@/lib/data/projects';
import { createInspection } from '@/lib/data/inspections';
import { useAuth } from '@/lib/auth';

const HARNESS_TEMPLATE_ID = '22222222-2222-2222-2222-222222222222';

export default function NewHarnessInspection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { profile } = useAuth();
  const preselectedProject = params.get('project') ?? '';

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const [selected, setSelected] = useState(preselectedProject);
  const [submitting, setSubmitting] = useState(false);

  const inspectorName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null;

  async function create(projectId: string) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const created = await createInspection({
        projectId,
        templateId: HARNESS_TEMPLATE_ID,
        inspectorName,
      });
      navigate(`/harness/${created.id}`, { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  // If project was pre-selected via URL, skip the picker and create immediately
  useEffect(() => {
    if (preselectedProject && projects.length > 0) {
      create(preselectedProject);
    }
    // Only run once when projects load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedProject, projects.length > 0]);

  if (preselectedProject) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-neutral-500">
        იქმნება...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/inspections" className="text-sm text-brand-600 hover:underline">
          ← შემოწმების აქტები
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          დამცავი ქამრების შემოწმება
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">აირჩიეთ პროექტი</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            selected={selected === p.id}
            onSelect={() => setSelected(p.id)}
          />
        ))}
      </div>

      {projects.length === 0 && (
        <p className="text-sm text-neutral-500">პროექტები ვერ მოიძებნა.</p>
      )}

      <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
        <Button variant="outline" onClick={() => navigate(-1)}>
          გაუქმება
        </Button>
        <Button
          disabled={!selected || submitting}
          onClick={() => selected && create(selected)}
        >
          {submitting ? 'იქმნება...' : 'შექმნა'}
        </Button>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  selected,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  onSelect: () => void;
}) {
  const initials = project.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all',
        selected
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
          : 'border-neutral-200 bg-white hover:border-brand-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-brand-600',
      ].join(' ')}
    >
      {/* Avatar */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
        {project.logo ? (
          <img src={project.logo} alt={project.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-base font-bold text-brand-600 dark:text-brand-400">{initials}</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{project.name}</p>
        {project.company_name && (
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{project.company_name}</p>
        )}
        {project.address && (
          <p className="mt-1 truncate text-xs text-neutral-400 dark:text-neutral-500">{project.address}</p>
        )}
      </div>

      {/* Radio */}
      <div
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected
            ? 'border-brand-500 bg-brand-500'
            : 'border-neutral-300 dark:border-neutral-600',
        ].join(' ')}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}
