import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProjectPicker } from '@/components/ui/project-picker';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { WizardShell } from '@/components/ui/wizard-shell';
import { listProjects } from '@/lib/data/projects';
import { createReport, type Report } from '@/lib/data/reports';

const STEPS = ['ძირითადი'];

export default function NewReport() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const prefilledProjectId = params.get('project') ?? '';

  const [projectId, setProjectId] = useState(prefilledProjectId);
  const [title, setTitle] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createReport({
        projectId,
        title: title.trim() || 'უსახელო რეპორტი',
      }),
    onSuccess: (created: Report) => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      navigate(`/reports/${created.id}`);
    },
  });

  const canFinish = !!projectId && !mutation.isPending;

  return (
    <WizardShell
      open
      onClose={() => navigate('/reports')}
      title="ახალი რეპორტი"
      steps={STEPS}
      currentStep={0}
      onPrev={() => {}}
      onNext={() => {}}
      onFinish={() => { if (canFinish) mutation.mutate(); }}
      isSubmitting={mutation.isPending}
      nextDisabled={!canFinish}
    >
      <div className="space-y-5">
        <p className="text-sm text-neutral-500">
          შექმენით დრაფტი — სლაიდები დაამატეთ რეპორტის გვერდზე.
        </p>

        {prefilledProjectId ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">პროექტი</p>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
              {(projects ?? []).find((p) => p.id === projectId)?.name ?? '…'}
            </div>
          </div>
        ) : (
          <ProjectPicker
            label="პროექტი"
            required
            value={projectId}
            onChange={setProjectId}
            options={(projects ?? []).map((p) => ({ value: p.id, label: p.name, logo: p.logo, company: p.company_name }))}
          />
        )}

        <FloatingLabelInput
          label="სათაური"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {mutation.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
          </div>
        )}
      </div>
    </WizardShell>
  );
}
