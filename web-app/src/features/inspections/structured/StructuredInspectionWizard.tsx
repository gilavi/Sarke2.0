/**
 * The unified structured-inspection DRAFT flow. ONE component builds every
 * structured act (bobcat, safety-net, …) through the full-page SplitWizard
 * layout: the step flow on the left, a LIVE preview of the actual document on
 * the right (the same `buildInspectionPdf` HTML the print route renders —
 * every per-answer save refetches the row and re-renders the preview).
 *
 * Create pattern (project standard): on a `/<type>/new` route the wizard shows
 * only the specs step; "next" creates the row and navigates to its detail route,
 * where the remaining steps unlock - so there is no `/<type>/draft` dead-end.
 *
 * Closing: drafts are persisted per answer, so ✕/Esc opens a confirm dialog
 * ("progress is saved") and lands on /home. On completion it marks the row
 * completed and navigates to the result screen (StructuredActPage routes
 * completed rows there) carrying the success payload - signature capture + PDF
 * live on that result screen, like harness. This wizard never shows a
 * signature step.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toastError } from '@/lib/errors';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { ErrorView, EmptyView } from '@/components/async/AsyncBoundary';
import type { SuccessModalData } from '@/components/web/SuccessModal';
import { SplitWizard, DocPreviewFrame } from '@/components/ui/split-wizard';
import { Button } from '@/components/ui/button';
import { WizardCloseDialog } from './WizardCloseDialog';
import { useAuth } from '@/lib/auth';
import { listProjects } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { useStructuredInspection } from './useStructuredInspection';
import { useActPreviewHtml } from './useActPreviewHtml';
import { SpecStep } from './steps/SpecStep';
import { StepBody } from './steps/StepBody';
import type { WizardDescriptor } from './types';

interface Props<T extends { id: string; status: string }, P, C> {
  descriptor: WizardDescriptor<T, P, C>;
  detailRoute: (id: string) => string;
}

export function StructuredInspectionWizard<T extends { id: string; status: string }, P, C>({
  descriptor,
  detailRoute,
}: Props<T, P, C>) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null;
  const wiz = useStructuredInspection(descriptor, detailRoute);

  const [searchParams] = useSearchParams();
  const { data: projects } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects, enabled: wiz.isNew });
  const [projectId, setProjectId] = useState(() => searchParams.get('project') ?? '');
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const projectName = wiz.isNew
    ? (projects ?? []).find((p) => p.id === projectId)?.name
    : wiz.project?.name;

  // The live document preview: the real PDF HTML while a draft row exists,
  // a blank act sheet on the legacy `/new` spec step.
  const previewHtml = useActPreviewHtml({
    category: descriptor.category,
    item: wiz.item,
    projectName: projectName ?? '',
    templateName: descriptor.title,
    inspectorName: profileName,
  });

  if (!wiz.isNew && wiz.isLoading) return <SkeletonDetailPage />;
  if (!wiz.isNew && wiz.isError) return <ErrorView error={wiz.error} />;
  if (!wiz.isNew && !wiz.item) return <EmptyView message="აქტი ვერ მოიძებნა." />;

  const item = wiz.item;
  // The specs/info step is dropped from the equipment act flow — the create
  // flow already captured the project, so the act goes straight to the
  // checklist (harness/xaracho never had a specs step).
  const steps = descriptor.steps[0]?.kind === 'specs' ? descriptor.steps.slice(1) : descriptor.steps;
  const total = steps.length;
  const current = steps[wiz.step];
  const isLast = wiz.step === total - 1;
  const itemId = item?.id ?? '';
  const busy = wiz.creating || submitting;

  async function handleNext() {
    if (wiz.isNew) {
      if (!projectId) return;
      try {
        await wiz.create({ projectId, inspectorName: profileName, specValues });
      } catch (e) {
        toastError(e);
      }
      return;
    }
    if (isLast) {
      setSubmitting(true);
      try {
        await wiz.complete();
        const summary = item ? descriptor.summary(item) : { total: 0, good: 0, problem: 0 };
        const successData: SuccessModalData = {
          totalCount: summary.total,
          safeCount: summary.good,
          problemCount: summary.problem,
          inspectionName: descriptor.title,
          projectName: projectName ?? '',
          itemLabel: descriptor.itemLabel,
        };
        navigate(detailRoute(itemId), { state: { inspectionSuccess: successData }, replace: true });
      } catch (e) {
        toastError(e);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    wiz.goStep(wiz.step + 1);
  }

  const canGoNext = (() => {
    if (wiz.isNew) return !!projectId && !wiz.creating;
    if (isLast) return !!item && descriptor.canComplete(item);
    if (current.kind === 'custom' && current.canAdvance && item) return current.canAdvance(item);
    return true;
  })();

  // Mono "N / M შემოწმებული" counter for checklist steps (answered / total).
  const progressCounter = (() => {
    if (wiz.isNew || !item || current?.kind !== 'checklist') return undefined;
    const totalItems = current.items.length;
    if (totalItems === 0) return undefined;
    const answered = current.getStates(item).filter((s) => s.result != null).length;
    return `${answered} / ${totalItems} შემოწმებული`;
  })();

  const subtitle = wiz.isNew
    ? 'ზოგადი ინფორმაცია'
    : [`ნაბიჯი ${wiz.step + 1}/${total}`, progressCounter].filter(Boolean).join(' · ');

  // Drafts persist per answer — ✕/Esc confirms instead of losing context. On
  // `/new` nothing exists yet, so close leaves immediately.
  function requestClose() {
    if (busy || confirmClose) return;
    if (wiz.isNew) {
      navigate('/home');
      return;
    }
    setConfirmClose(true);
  }

  return (
    <SplitWizard
      title={descriptor.title}
      subtitle={subtitle}
      saved={!wiz.isNew && !wiz.updating}
      onClose={requestClose}
      preview={<DocPreviewFrame html={previewHtml} />}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => wiz.goStep(wiz.step - 1)}
            disabled={wiz.step === 0 || wiz.updating || busy}
          >
            უკან
          </Button>
          <div className="flex-1" />
          <Button onClick={handleNext} disabled={!canGoNext || submitting} loading={busy}>
            {wiz.isNew ? 'შექმნა' : isLast ? 'დასრულება' : 'შემდეგი'}
          </Button>
        </>
      }
    >
      {wiz.isNew ? (
        <SpecStep
          fields={descriptor.steps[0].kind === 'specs' ? descriptor.steps[0].fields : []}
          isNew
          model={null}
          disabled={false}
          onSave={() => {}}
          projects={projects ?? []}
          projectId={projectId}
          onProjectChange={setProjectId}
          specValues={specValues}
          onSpecChange={(k, v) => setSpecValues((p) => ({ ...p, [k]: v }))}
        />
      ) : item ? (
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{current.title}</h2>
          <StepBody
            step={current}
            item={item}
            itemId={itemId}
            onSave={wiz.save}
            onDelete={wiz.del}
            deleting={wiz.deleting}
          />
        </div>
      ) : null}

      <WizardCloseDialog open={confirmClose} onOpenChange={setConfirmClose} onConfirm={() => navigate('/home')} />
    </SplitWizard>
  );
}
