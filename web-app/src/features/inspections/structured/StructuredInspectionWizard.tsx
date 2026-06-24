/**
 * The unified structured-inspection DRAFT flow. ONE component builds every
 * structured act (bobcat, safety-net, …) through the harness-styled wizard shell,
 * driven by a per-act `WizardDescriptor`. Step rhythm matches harness:
 *   specs → checklist section(s)/custom → verdict, then "დასრულება".
 *
 * Create pattern (project standard): on a `/<type>/new` route the wizard shows
 * only the specs step; "next" creates the row and navigates to its detail route,
 * where the remaining steps unlock - so there is no `/<type>/draft` dead-end.
 *
 * On completion it marks the row completed and navigates to the result screen
 * (StructuredActPage routes completed rows there) carrying the success payload -
 * signature capture + PDF live on that result screen, like harness. This wizard
 * never shows a signature step.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toastError } from '@/lib/errors';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { ErrorView, EmptyView } from '@/components/async/AsyncBoundary';
import type { SuccessModalData } from '@/components/web/SuccessModal';
import { WizardFrame } from '@/components/wizard';
import { useAuth } from '@/lib/auth';
import { listProjects } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { useStructuredInspection } from './useStructuredInspection';
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

  if (!wiz.isNew && wiz.isLoading) return <SkeletonDetailPage />;
  if (!wiz.isNew && wiz.isError) return <ErrorView error={wiz.error} />;
  if (!wiz.isNew && !wiz.item) return <EmptyView message="აქტი ვერ მოიძებნა." />;

  const item = wiz.item;
  // The specs/info step is dropped from the equipment act flow — the create
  // modal already captured the project, so the act goes straight to the
  // checklist (harness/xaracho never had a specs step).
  const steps = descriptor.steps[0]?.kind === 'specs' ? descriptor.steps.slice(1) : descriptor.steps;
  const total = steps.length;
  const current = steps[wiz.step];
  const isLast = wiz.step === total - 1;
  const itemId = item?.id ?? '';

  const projectName = wiz.isNew
    ? (projects ?? []).find((p) => p.id === projectId)?.name
    : wiz.project?.name;

  async function handleNext() {
    if (wiz.isNew) {
      if (!projectId) return;
      await wiz.create({ projectId, inspectorName: profileName, specValues });
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

  const stepName = wiz.isNew ? 'ზოგადი ინფორმაცია' : `${current.title} · ${wiz.step + 1}/${total}`;

  return (
    <WizardFrame
      open
      onClose={() => navigate(routes.inspections.list())}
      projectName={projectName}
      inspectionName={descriptor.title}
      stepName={stepName}
      showProgress={!wiz.isNew}
      progressPercent={total > 1 ? (wiz.step / (total - 1)) * 100 : 0}
      closeDisabled={wiz.updating || wiz.creating || submitting}
      stepKey={wiz.step}
      direction={wiz.direction}
      onBack={() => wiz.goStep(wiz.step - 1)}
      onNext={handleNext}
      backDisabled={wiz.step === 0 || wiz.updating || wiz.creating || submitting}
      nextDisabled={!canGoNext || submitting}
      nextLabel={wiz.isNew ? 'შექმნა' : isLast ? 'დასრულება' : 'შემდეგი'}
      hideNextArrow={isLast}
      submitting={wiz.creating || submitting}
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
        <StepBody
          step={current}
          item={item}
          itemId={itemId}
          onSave={wiz.save}
          onDelete={wiz.del}
          deleting={wiz.deleting}
        />
      ) : null}
    </WizardFrame>
  );
}
