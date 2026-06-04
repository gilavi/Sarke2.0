import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import InspectionWizard from '@/components/InspectionWizard';
import { harnessWizardPreset } from '@/components/inspections/harnessPreset';
import { getProject, type Project } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { AsyncBoundary } from '@/components/async/AsyncBoundary';
import { ProjectHeader } from './ProjectHeader';
import { ProjectDetailsCard } from './ProjectDetailsCard';
import { CrewSection } from './CrewSection';
import { SignersSection } from './SignersSection';
import { InspectionsSection } from './InspectionsSection';
import { IncidentsSection } from './IncidentsSection';
import { BriefingsSection } from './BriefingsSection';
import { ReportsSection } from './ReportsSection';
import { FilesSection } from './FilesSection';
import { OrdersSection } from './OrdersSection';
import { DangerZoneSection } from './DangerZoneSection';
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

  const { data: project, isLoading, error: queryError } = useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject(id),
    enabled: !!id,
    placeholderData: () =>
      qc.getQueryData<Project[]>(projectKeys.lists())?.find((p) => p.id === id) ?? undefined,
  });

  const [editing, setEditing] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [harnessOpen, setHarnessOpen] = useState(false);
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
      <SectionGroup label="გუნდი" />
      <AsyncBoundary>
        <CrewSection project={project} onError={setActionError} />
      </AsyncBoundary>
      <AsyncBoundary>
        <SignersSection projectId={project.id} onError={setActionError} />
      </AsyncBoundary>

      <SectionGroup label="ჩანაწერები" />
      <AsyncBoundary>
        <InspectionsSection
          projectId={project.id}
          onNew={(category) => {
            if (category === 'harness') setHarnessOpen(true);
            else setWizardOpen(true);
          }}
        />
      </AsyncBoundary>
      <AsyncBoundary>
        <IncidentsSection projectId={project.id} />
      </AsyncBoundary>
      <AsyncBoundary>
        <BriefingsSection projectId={project.id} />
      </AsyncBoundary>

      <SectionGroup label="დოკუმენტები" />
      <AsyncBoundary>
        <ReportsSection projectId={project.id} />
      </AsyncBoundary>
      <AsyncBoundary>
        <FilesSection projectId={project.id} onError={setActionError} />
      </AsyncBoundary>
      <AsyncBoundary>
        <OrdersSection projectId={project.id} />
      </AsyncBoundary>

      <AsyncBoundary>
        <DangerZoneSection project={project} onError={setActionError} />
      </AsyncBoundary>

      <InspectionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        defaultProjectId={project.id}
      />
      <InspectionWizard
        open={harnessOpen}
        onClose={() => setHarnessOpen(false)}
        defaultProjectId={project.id}
        preset={harnessWizardPreset}
      />
    </div>
  );
}
