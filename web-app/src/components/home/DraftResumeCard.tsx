import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useActRows } from '@/lib/data/recordRows';
import { listProjects } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';

/**
 * "Resume your draft" card on Home — surfaces the newest unfinished act
 * (status !== 'completed') from useActRows with a continue CTA. Renders
 * nothing when everything is completed (or while loading).
 */
export function DraftResumeCard() {
  const { rows, isLoading } = useActRows();
  const { data: projects } = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: listProjects,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return null;
  const draft = rows.find((r) => r.status !== 'completed');
  if (!draft) return null;

  const projectName = draft.projectId
    ? projects?.find((p) => p.id === draft.projectId)?.name ?? null
    : null;
  const date = draft.date ? new Date(draft.date).toLocaleDateString('ka-GE') : '';
  const subtitle = [projectName, date].filter(Boolean).join(' · ');

  return (
    <div className="flex items-center gap-4 rounded-xl border border-l-[3px] border-[var(--border-default)] border-l-brand-500 bg-[var(--bg-card)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
          დაუსრულებელი აქტი — {draft.label}
        </p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{subtitle}</p>
        ) : null}
      </div>
      <Button variant="outline" size="sm" className="shrink-0" component={Link} to={draft.href}>
        გაგრძელება
      </Button>
    </div>
  );
}
