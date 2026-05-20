import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText } from 'lucide-react';
import { Modal } from '@mantine/core';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { toast } from 'sonner';
import DeleteButton from '@/components/DeleteButton';
import InspectionSignatures from '@/components/InspectionSignatures';
import InspectionInfoView from '@/components/InspectionInfoView';
import { Button } from '@/components/ui/button';
import {
  deleteInspection,
  getInspection,
  listAnswers,
  listQuestions,
  updateInspection,
  type Answer,
  type SignatoryEntry,
} from '@/lib/data/inspections';
import { getProject } from '@/lib/data/projects';
import { routes } from '@/app/routes';

export default function HarnessInspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const [justCompleted, setJustCompleted] = useState(() => {
    const flag = !!(location.state as { justCompleted?: boolean } | null)?.justCompleted;
    if (flag) {
      // Clear the flag from the history entry so a page refresh doesn't re-show the modal.
      window.history.replaceState({}, '', window.location.href);
    }
    return flag;
  });

  const inspectionQ = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => getInspection(id!),
    enabled: !!id,
  });
  const inspection = inspectionQ.data ?? null;
  const projectId = inspection?.project_id;
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  const questionsQ = useQuery({
    queryKey: ['questions', inspection?.template_id],
    queryFn: () => listQuestions(inspection!.template_id),
    enabled: !!inspection?.template_id,
  });
  const answersQ = useQuery({
    queryKey: ['answers', id],
    queryFn: () => listAnswers(id!),
    enabled: !!id,
  });

  const gridQuestion =
    (questionsQ.data ?? []).find((q) => q.type === 'component_grid') ?? null;
  const answers: Answer[] = answersQ.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateInspection>[1]) => updateInspection(id!, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection', id] });
      qc.invalidateQueries({ queryKey: ['inspections'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInspection(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections'] });
      navigate('/inspections');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  if (inspectionQ.isLoading) return <SkeletonDetailPage />;
  if (!inspection) return <p className="text-sm text-neutral-500">აქტი ვერ მოიძებნა.</p>;

  const isDraft = inspection.status === 'draft' || inspection.status === 'in_progress';

  return (
    <div className="space-y-6">
      {/* ── Completion success modal — shown after completing via HarnessInspectionModal ── */}
      <Modal
        opened={justCompleted}
        onClose={() => setJustCompleted(false)}
        withCloseButton={false}
        centered
        size="sm"
        radius="lg"
        overlayProps={{ blur: 3 }}
      >
        <div className="flex flex-col items-center gap-4 px-2 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              შემოწმება დასრულდა
            </p>
            {inspection.is_safe_for_use !== null && (
              <p className="mt-1 text-sm text-neutral-500">
                {inspection.is_safe_for_use ? 'სტატუსი: უსაფრთხოა ✓' : 'სტატუსი: არ არის უსაფრთხო'}
              </p>
            )}
          </div>
          <button
            onClick={() => setJustCompleted(false)}
            className="rounded-2xl bg-brand-500 px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 active:scale-95"
          >
            დახურვა
          </button>
        </div>
      </Modal>

      {/* ── Page header ── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-sm">
            {project && (
              <>
                <Link to={routes.projects.detail(project.id)} className="text-brand-600 hover:underline">
                  {project.name}
                </Link>
                <span className="text-neutral-400">›</span>
              </>
            )}
            <Link to={routes.inspections.list(projectId)} className="text-brand-600 hover:underline">
              შემოწმების აქტები
            </Link>
            <span className="text-neutral-400">›</span>
            <span className="truncate max-w-[200px] text-neutral-500">
              {inspection?.harness_name || 'ქამარი'}
            </span>
          </nav>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {inspection.harness_name || `ქამარი #${inspection.id.slice(0, 8)}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            სტატუსი: {inspection.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`#/inspections/${inspection.id}/print`, '_blank')}
          >
            <FileText size={14} className="mr-1" />
            PDF
          </Button>
          <DeleteButton
            onDelete={() => deleteMutation.mutate()}
            isPending={deleteMutation.isPending}
          />
        </div>
      </header>

      {/* ── Signatures ── */}
      <InspectionSignatures
        inspection={inspection}
        canEdit={inspection.status === 'completed'}
        onUpdate={(sigs: SignatoryEntry[]) => updateMutation.mutate({ signatories: sigs })}
      />

      {/* ── Inspection info ── */}
      <InspectionInfoView
        inspection={inspection}
        isDraft={isDraft}
        answers={answers}
        gridQuestion={gridQuestion}
        onFieldSave={(patch) => updateMutation.mutate(patch)}
      />
    </div>
  );
}
