import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, FileText, ShieldCheck } from 'lucide-react';
import { getProject, type Project } from '@/lib/data/projects';
import { listOrdersByProject } from '@/lib/data/orders';
import { useActRows } from '@/lib/data/recordRows';
import { orderKeys, projectKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { AsyncBoundary } from '@/components/async/AsyncBoundary';
import { QuickActionsRow, type QuickActionDef } from '@/components/ui/quick-actions';
import { ProjectHeader } from './ProjectHeader';
import { ProjectDetailsCard } from './ProjectDetailsCard';
import { CrewSection } from './CrewSection';
import { SignersSection } from './SignersSection';
import { FilesSection } from './FilesSection';
import { DangerZoneSection } from './DangerZoneSection';
import { RecordsSection } from './RecordsSection';
import { OrdersSection } from './OrdersSection';
import { ReportsSection } from './ReportsSection';
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError } from '@/lib/errors';

function SectionGroup({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
        {label}
      </span>
      <div className="flex-1 border-t border-neutral-100 dark:border-neutral-800" />
    </div>
  );
}

export default function ProjectDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: project, isLoading, error: queryError } = useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject(id),
    enabled: !!id,
    placeholderData: () =>
      qc.getQueryData<Project[]>(projectKeys.lists())?.find((p) => p.id === id) ?? undefined,
  });

  // Counts for the stats strip (same cache keys the sections below subscribe to).
  const { rows: actRows } = useActRows(id);
  const { data: orders } = useQuery({
    queryKey: orderKeys.list(id),
    queryFn: () => listOrdersByProject(id),
    enabled: !!id,
  });

  const quickActions: QuickActionDef[] = [
    {
      key: 'inspection',
      label: 'შემოწმება',
      description: 'ახალი შემოწმების აქტი',
      icon: ShieldCheck,
      tone: 'brand',
      onClick: () => navigate(`${routes.inspections.new}?project=${id}`),
    },
    {
      key: 'order',
      label: 'ბრძანება',
      description: 'ახალი ბრძანება — PDF',
      icon: Award,
      tone: 'cert',
      onClick: () => navigate(`${routes.orders.new}?project=${id}`),
    },
    {
      key: 'report',
      label: 'რეპორტი',
      description: 'ფოტო-რეპორტი სლაიდებით',
      icon: FileText,
      tone: 'danger',
      onClick: () => navigate(`${routes.reports.new}?project=${id}`),
    },
  ];

  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const error =
    actionError ??
    (queryError ? humanizeError(queryError) : null);

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!project) {
    if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
    return <p className="text-sm text-neutral-500">პროექტი ვერ მოიძებნა.</p>;
  }

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={project}
        editing={editing}
        onEdit={() => setEditing(true)}
        onError={setActionError}
      />
      <AsyncBoundary>
        <ProjectDetailsCard
          project={project}
          editing={editing}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
          onError={setActionError}
        />
      </AsyncBoundary>

      <QuickActionsRow actions={quickActions} />

      {/* Stats strip: record counts for this project. */}
      <div className="flex divide-x divide-[var(--border-default)] rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
        <p className="flex-1 px-4 py-3 text-center text-sm text-[var(--text-secondary)]">
          <span className="font-bold tabular-nums text-[var(--text-primary)]">{actRows.length}</span> აქტი
        </p>
        <p className="flex-1 px-4 py-3 text-center text-sm text-[var(--text-secondary)]">
          <span className="font-bold tabular-nums text-[var(--text-primary)]">{orders?.length ?? 0}</span> ბრძანება
        </p>
      </div>

      <AsyncBoundary>
        <RecordsSection projectId={project.id} />
      </AsyncBoundary>
      <AsyncBoundary>
        <OrdersSection projectId={project.id} onError={setActionError} />
      </AsyncBoundary>
      <AsyncBoundary>
        <ReportsSection projectId={project.id} onError={setActionError} />
      </AsyncBoundary>

      <SectionGroup label="გუნდი" />
      <AsyncBoundary>
        <CrewSection project={project} onError={setActionError} />
      </AsyncBoundary>
      <AsyncBoundary>
        <SignersSection projectId={project.id} onError={setActionError} />
      </AsyncBoundary>

      <SectionGroup label="ფაილები" />
      <AsyncBoundary>
        <FilesSection projectId={project.id} onError={setActionError} />
      </AsyncBoundary>

      <AsyncBoundary>
        <DangerZoneSection project={project} onError={setActionError} />
      </AsyncBoundary>
    </div>
  );
}
