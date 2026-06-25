/**
 * Result/detail screen for a generic (harness / scaffold-"xaracho") act — the
 * non-structured equivalent of `features/inspections/structured/StructuredInspectionResult`.
 * A scrollable page: breadcrumb header + PDF/delete actions, the read-only info
 * summary (`InspectionInfoView`), and — once completed — the `SignatureCapture`
 * section that generates the signed PDF.
 *
 * Regulatory: the signature captured by `SignatureCapture` is handed to the
 * print route via in-memory router state and is never persisted. Drafts hide the
 * signature box (nothing to sign yet).
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import DeleteButton from '@/components/DeleteButton';
import InspectionInfoView from '@/components/InspectionInfoView';
import SignatureCapture from '@/components/SignatureCapture';
import SuccessModal, { type SuccessModalData } from '@/components/web/SuccessModal';
import { useInspectionName } from '@/lib/documentNames';
import {
  deleteInspection,
  getInspection,
  listAnswers,
  listQuestions,
  updateInspection,
  type Answer,
} from '@/lib/data/inspections';
import { getProject } from '@/lib/data/projects';
import { routes } from '@/app/routes';
import { projectKeys, inspectionKeys } from '@/app/queryKeys';
import { toastError } from '@/lib/errors';

export default function InspectionResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const inspectionName = useInspectionName();

  /* Success modal, shown when the wizard navigates here after completion. */
  const [successData, setSuccessData] = useState<SuccessModalData | null>(
    () => (location.state as { inspectionSuccess?: SuccessModalData } | null)?.inspectionSuccess ?? null,
  );
  const closeSuccess = () => {
    setSuccessData(null);
    // Drop the router state so the modal doesn't reappear on back-navigation.
    if ((location.state as { inspectionSuccess?: SuccessModalData } | null)?.inspectionSuccess) {
      navigate(location.pathname, { replace: true, state: null });
    }
  };

  const inspectionQ = useQuery({
    queryKey: inspectionKeys.detail(id),
    queryFn: () => getInspection(id!),
    enabled: !!id,
  });
  const inspection = inspectionQ.data ?? null;
  const projectId = inspection?.project_id;
  const { data: project } = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });
  const questionsQ = useQuery({
    queryKey: inspectionKeys.questions(inspection?.template_id),
    queryFn: () => listQuestions(inspection!.template_id),
    enabled: !!inspection?.template_id,
  });
  const answersQ = useQuery({
    queryKey: inspectionKeys.answers(id),
    queryFn: () => listAnswers(id!),
    enabled: !!id,
  });

  const gridQuestion = (questionsQ.data ?? []).find((q) => q.type === 'component_grid') ?? null;
  const answers: Answer[] = answersQ.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateInspection>[1]) => updateInspection(id!, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inspectionKeys.detail(id) });
      qc.invalidateQueries({ queryKey: inspectionKeys.lists() });
    },
    onError: (e) => toastError(e),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteInspection(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inspectionKeys.lists() });
      navigate(routes.inspections.list());
    },
    onError: (e) => toastError(e),
  });

  const openPdfBlank = () => window.open(`#${routes.inspections.print(id!)}`, '_blank');

  const successModal = (
    <SuccessModal
      isOpen={!!successData}
      onClose={closeSuccess}
      onGeneratePDF={openPdfBlank}
      data={successData ?? { totalCount: 0, safeCount: 0, problemCount: 0, inspectionName: '', projectName: '', itemLabel: '' }}
    />
  );

  if (inspectionQ.isLoading) return <>{successModal}<SkeletonDetailPage /></>;
  if (!inspection) return <>{successModal}<p className="text-sm text-neutral-500">აქტი ვერ მოიძებნა.</p></>;

  const isDraft = inspection.status === 'draft' || inspection.status === 'in_progress';

  return (
    <div className="space-y-6">
      {successModal}

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
            <span className="truncate max-w-[200px] text-neutral-500">{inspectionName(inspection.template_id)}</span>
          </nav>
          <h1 className="mt-2 font-display text-heading-1 text-neutral-900 dark:text-neutral-100">
            {inspectionName(inspection.template_id)}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            სტატუსი: {inspection.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openPdfBlank}>
            <FileText size={14} className="mr-1" /> PDF
          </Button>
          <DeleteButton onDelete={() => deleteMutation.mutate()} isPending={deleteMutation.isPending} />
        </div>
      </header>

      {/* Read-only info / verdict / grid / photos */}
      <InspectionInfoView
        inspection={inspection}
        isDraft={isDraft}
        answers={answers}
        gridQuestion={gridQuestion}
        onFieldSave={(patch) => updateMutation.mutate(patch)}
      />

      {/* Signature capture (regulatory: in-memory only, never persisted) */}
      {!isDraft && (
        <SignatureCapture
          creatorName={inspection.inspector_name ?? ''}
          onGenerate={(session) =>
            navigate(routes.inspections.print(inspection.id), { state: { signaturesSession: session } })
          }
        />
      )}
    </div>
  );
}
