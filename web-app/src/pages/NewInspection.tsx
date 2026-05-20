import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { ProjectPicker } from '@/components/ui/project-picker';
import { WizardShell } from '@/components/ui/wizard-shell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { listProjects } from '@/lib/data/projects';
import { listTemplates } from '@/lib/data/templates';

const STEPS = ['შაბლონი'];

export default function NewInspection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefilledProjectId = params.get('project') ?? '';

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const { data: templates } = useQuery({ queryKey: ['templates'], queryFn: listTemplates });

  const [projectId, setProjectId] = useState(prefilledProjectId);
  const [templateId, setTemplateId] = useState('');

  const canFinish = !!projectId && !!templateId;
  const selectedTemplate = (templates ?? []).find((t) => t.id === templateId);
  const selectedProject = (projects ?? []).find((p) => p.id === projectId);

  function handleFinish() {
    if (!canFinish) return;
    navigate('/inspections/draft', {
      state: { pendingCreate: { projectId, templateId } },
    });
  }

  return (
    <WizardShell
      open
      onClose={() => navigate('/inspections')}
      title="ახალი შემოწმების აქტი"
      steps={STEPS}
      currentStep={0}
      onPrev={() => {}}
      onNext={() => {}}
      onFinish={handleFinish}
      nextDisabled={!canFinish}
    >
      <div className="space-y-5">
        <p className="text-sm text-neutral-500">
          აირჩიეთ შაბლონი — კითხვები შეივსება აქტის გვერდზე.
        </p>

        {prefilledProjectId ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">პროექტი</p>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
              {selectedProject?.name ?? '…'}
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

        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">შაბლონი *</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <span className={selectedTemplate ? 'text-neutral-900' : 'text-neutral-400'}>
                  {selectedTemplate
                    ? `${selectedTemplate.name}${selectedTemplate.is_system ? ' (სისტემური)' : ''}`
                    : '— აირჩიეთ შაბლონი —'}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
              align="start"
            >
              {(templates ?? []).length === 0 && (
                <DropdownMenuItem disabled>შაბლონი არ არის</DropdownMenuItem>
              )}
              {(templates ?? []).map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => setTemplateId(t.id)}>
                  {t.name}{t.is_system ? ' (სისტემური)' : ''}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </WizardShell>
  );
}
