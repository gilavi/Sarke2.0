import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { SplitWizard } from '@/components/ui/split-wizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WizardCloseDialog } from '@/features/inspections/structured/WizardCloseDialog';
import { toastError } from '@/lib/errors';
import { getProject } from '@/lib/data/projects';
import {
  addReportSlide,
  removeReportSlide,
  updateReport,
  updateReportSlide,
  type Report,
  type ReportSlide,
} from '@/lib/data/reports';
import { projectKeys, reportKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { SlideEditorCard } from './SlideEditorCard';
import { ReportPreview } from './ReportPreview';

/**
 * ReportEditor — the draft photo-report flow inside the canonical SplitWizard:
 * title + slide stack on the left, the live presentation preview on the right.
 * Every change autosaves through updateReport/updateReportSlide (the header's
 * "დრაფტი შენახულია" badge shows while no save is in flight); დასრულება flips
 * the status to `completed` and lands on the read-only view of the same route.
 */
export function ReportEditor({ report }: { report: Report }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [closing, setClosing] = useState(false);
  const [title, setTitle] = useState(report.title);
  const slides = report.slides ?? [];

  const { data: project } = useQuery({
    queryKey: projectKeys.detail(report.project_id),
    queryFn: () => getProject(report.project_id),
  });

  function applyUpdated(updated: Report) {
    qc.setQueryData(reportKeys.detail(report.id), updated);
    qc.invalidateQueries({ queryKey: reportKeys.lists() });
  }

  const saveTitle = useMutation({
    mutationFn: (t: string) => updateReport(report.id, { title: t }),
    onSuccess: applyUpdated,
    onError: (e) => {
      setTitle(report.title);
      toastError(e);
    },
  });
  const addSlide = useMutation({
    mutationFn: () => addReportSlide({ report, title: '', description: '' }),
    onSuccess: applyUpdated,
    onError: toastError,
  });
  const patchSlide = useMutation({
    mutationFn: ({ slideId, patch }: { slideId: string; patch: Partial<ReportSlide> }) =>
      updateReportSlide(report, slideId, patch),
    onSuccess: applyUpdated,
  });
  const removeSlide = useMutation({
    mutationFn: (slideId: string) => removeReportSlide(report, slideId),
    onSuccess: applyUpdated,
    onError: toastError,
  });
  const finish = useMutation({
    mutationFn: () => updateReport(report.id, { status: 'completed' }),
    onSuccess: (updated) => {
      applyUpdated(updated);
      navigate(routes.reports.detail(report.id), { replace: true });
    },
    onError: toastError,
  });

  const savePending =
    saveTitle.isPending || addSlide.isPending || patchSlide.isPending ||
    removeSlide.isPending || finish.isPending;

  return (
    <>
      <SplitWizard
        title="ფოტო-რეპორტი"
        subtitle={project?.name ?? undefined}
        saved={!savePending}
        onClose={() => setClosing(true)}
        preview={<ReportPreview report={report} projectName={project?.name} />}
        previewLabel="რეპორტის გადახედვა"
        footer={
          <>
            <span className="flex-1 text-xs text-[var(--text-muted)]">{slides.length} სლაიდი</span>
            <Button onClick={() => finish.mutate()} disabled={finish.isPending || slides.length === 0}>
              {finish.isPending ? 'ინახება…' : 'დასრულება'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]" htmlFor="report-title">
              რეპორტის სათაური
            </label>
            <Input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                const v = title.trim();
                if (v && v !== report.title) saveTitle.mutate(v);
              }}
            />
          </div>

          {slides.map((slide, i) => (
            <SlideEditorCard
              key={slide.id}
              report={report}
              slide={slide}
              index={i}
              onSave={(patch) => patchSlide.mutateAsync({ slideId: slide.id, patch })}
              onRemove={() => removeSlide.mutate(slide.id)}
              isRemoving={removeSlide.isPending && removeSlide.variables === slide.id}
            />
          ))}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => addSlide.mutate()}
            disabled={addSlide.isPending}
          >
            <Plus size={16} className="mr-1" />
            სლაიდის დამატება
          </Button>
        </div>
      </SplitWizard>

      <WizardCloseDialog
        open={closing}
        onOpenChange={setClosing}
        onConfirm={() => navigate(routes.home)}
      />
    </>
  );
}
