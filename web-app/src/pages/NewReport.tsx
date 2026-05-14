import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
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
            <Label>პროექტი</Label>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
              {(projects ?? []).find((p) => p.id === projectId)?.name ?? '…'}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="project">პროექტი *</Label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— აირჩიეთ პროექტი —</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
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
