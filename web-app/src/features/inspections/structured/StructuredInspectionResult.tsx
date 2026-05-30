/**
 * Read-only result/detail screen for a COMPLETED structured inspection — the
 * structured-act equivalent of `pages/HarnessInspectionDetail`. A normal
 * scrollable page (NOT the wizard frame): breadcrumb header + PDF/delete actions,
 * read-only general info / checklist summary / verdict, and the SignatureCapture
 * section at the bottom that generates the signed PDF.
 *
 * Regulatory: `SignatureCapture` lives here (mirrors harness) — the captured
 * signature is handed to the print route via in-memory router state and never
 * persisted. Drafts render the wizard instead (see StructuredActPage).
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { ErrorView, EmptyView } from '@/components/async/AsyncBoundary';
import DeleteButton from '@/components/DeleteButton';
import SignatureCapture from '@/components/SignatureCapture';
import SuccessModal, { type SuccessModalData } from '@/components/web/SuccessModal';
import { useEntityMutation } from '@/lib/query/useEntityMutation';
import { getProject } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import type { SignaturesSectionData } from '@/lib/inspection/renderSignaturesSection';
import type { StructuredAct } from './acts';

export function StructuredInspectionResult({ act }: { act: StructuredAct }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { descriptor } = act;

  const [successData, setSuccessData] = useState<SuccessModalData | null>(
    () => (location.state as { inspectionSuccess?: SuccessModalData } | null)?.inspectionSuccess ?? null,
  );

  const itemQ = useQuery({ queryKey: descriptor.detailKey(id), queryFn: () => descriptor.get(id!), enabled: !!id });
  const item = itemQ.data ?? null;
  const projectId = item ? descriptor.getProjectId(item) : null;
  const { data: project } = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  const delMutation = useEntityMutation<void, void>({
    mutationFn: () => descriptor.remove(id!),
    invalidate: () => [descriptor.listKey()],
    onDone: () => navigate(routes.inspections.list()),
  });

  function openPdfBlank() {
    window.open(`#${act.print(id!)}`, '_blank');
  }
  function openPdfSigned(session: SignaturesSectionData) {
    navigate(act.print(id!), { state: { signaturesSession: session } });
  }
  function closeSuccess() {
    setSuccessData(null);
    if ((location.state as { inspectionSuccess?: SuccessModalData } | null)?.inspectionSuccess) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }

  if (itemQ.isLoading) return <SkeletonDetailPage />;
  if (itemQ.isError) return <ErrorView error={itemQ.error} />;
  if (!item) return <EmptyView message="აქტი ვერ მოიძებნა." />;

  const creatorName = descriptor.inspectorName?.(item) ?? '';
  const summary = descriptor.summary(item);

  return (
    <div className="space-y-6">
      <SuccessModal
        isOpen={!!successData}
        onClose={closeSuccess}
        onGeneratePDF={openPdfBlank}
        data={successData ?? { totalCount: 0, safeCount: 0, problemCount: 0, inspectionName: '', projectName: '', itemLabel: '' }}
      />

      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-sm">
            {project && (
              <>
                <Link to={routes.projects.detail(project.id)} className="text-brand-600 hover:underline">{project.name}</Link>
                <span className="text-neutral-400">›</span>
              </>
            )}
            <Link to={routes.inspections.list(projectId)} className="text-brand-600 hover:underline">შემოწმების აქტები</Link>
            <span className="text-neutral-400">›</span>
            <span className="truncate max-w-[220px] text-neutral-500">{descriptor.title}</span>
          </nav>
          <h1 className="mt-2 font-display text-heading-1 text-neutral-900 dark:text-neutral-100">{descriptor.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">სტატუსი: დასრულდა</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openPdfBlank}>
            <FileText size={14} className="mr-1" /> PDF
          </Button>
          <DeleteButton onDelete={() => delMutation.mutate()} isPending={delMutation.isPending} />
        </div>
      </header>

      {/* Read-only step summaries */}
      {descriptor.steps.map((step) => {
        if (step.kind === 'specs') {
          return (
            <Card key={step.key}>
              <CardHeader><CardTitle className="text-base">{step.title}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {step.fields.map((f) => (
                  <div key={f.key}>
                    <div className="text-xs text-neutral-500">{f.label}</div>
                    <div className="text-neutral-900 dark:text-neutral-100">{f.value(item) || '—'}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        }
        if (step.kind === 'verdict') {
          const v = step.getVerdict(item);
          const opt = step.options.find((o) => o.value === v);
          return (
            <Card key={step.key}>
              <CardHeader><CardTitle className="text-base">{step.title}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>დასკვნა: <span className="font-medium">{opt?.label ?? '—'}</span></div>
                <div className="text-neutral-600 dark:text-neutral-400">{step.getNotes(item) || '—'}</div>
              </CardContent>
            </Card>
          );
        }
        if (step.kind === 'checklist') {
          const states = step.getStates(item);
          const answered = states.filter((s) => s.result !== null).length;
          return (
            <Card key={step.key}>
              <CardHeader><CardTitle className="text-base">{step.title}</CardTitle></CardHeader>
              <CardContent className="text-sm text-neutral-600 dark:text-neutral-400">
                {answered}/{step.items.length} შემოწმდა
              </CardContent>
            </Card>
          );
        }
        return null;
      })}

      {/* Stat line */}
      <p className="text-sm text-neutral-500">
        {summary.total} {descriptor.itemLabel} შემოწმდა — {summary.good} კარგია, {summary.problem} პრობლემა
      </p>

      {/* Signature capture (regulatory: in-memory only, never persisted) */}
      <Card>
        <CardHeader><CardTitle className="text-base">ხელმოწერა და PDF</CardTitle></CardHeader>
        <CardContent>
          <SignatureCapture creatorName={creatorName} onGenerate={openPdfSigned} />
        </CardContent>
      </Card>
    </div>
  );
}
