import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProjectPicker } from '@/components/ui/project-picker';
import { WizardFrame } from '@/components/wizard';
import { listProjects } from '@/lib/data/projects';
import { equipmentInspectionName } from '@/lib/documentNames';
import { projectKeys } from '@/app/queryKeys';
import { createCargoPlatformInspection } from '@/lib/data/cargoPlatform';

export default function NewCargoPlatformInspection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!projectId && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const insp = await createCargoPlatformInspection({ projectId });
      navigate(`/cargo-platform/${insp.id}`, { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <WizardFrame
      open
      onClose={() => navigate('/inspections')}
      inspectionName={equipmentInspectionName('cargo_platform')}
      stepName="პროექტის არჩევა"
      showProgress={false}
      progressPercent={0}
      stepKey="new"
      direction={1}
      onBack={() => navigate('/inspections')}
      backDisabled
      onNext={handleSubmit}
      nextDisabled={!canSubmit}
      nextLabel={submitting ? 'იქმნება…' : 'შექმნა'}
      hideNextArrow
      submitting={submitting}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">პროექტი</p>
        <ProjectPicker
          label=""
          required
          value={projectId}
          onChange={setProjectId}
          options={(projects ?? []).map((p) => ({ value: p.id, label: p.name, logo: p.logo, company: p.company_name }))}
        />
      </div>
    </WizardFrame>
  );
}
