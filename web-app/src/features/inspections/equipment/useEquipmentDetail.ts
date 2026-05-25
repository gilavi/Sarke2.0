/**
 * Shared lifecycle for an equipment-inspection detail page.
 *
 * Every equipment detail page (bobcat, excavator, general-equipment,
 * cargo-platform) repeated the same ~150 lines: the draft/pending redirect, the
 * item + project queries, the update/delete mutations with their cache
 * invalidation, the save() no-op-while-pending guard, and the step / pdf /
 * justCompleted UI state. That logic lives here once, parameterized by the
 * per-type repo functions and query-key factory. The per-type page keeps only
 * its type-specific rendering (which sections/fields/checklists to draw) and
 * its first-edit draft-commit (it calls `lazyCreate` with its own create fn).
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingCreate } from '@/lib/usePendingCreate';
import { useEntityQuery } from '@/lib/query/useEntityQuery';
import { useEntityMutation, type QueryKey } from '@/lib/query/useEntityMutation';
import { getProject, type Project } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';

export interface EquipmentDetailConfig<TModel extends { id: string }, TPatch> {
  get: (id: string) => Promise<TModel | null>;
  update: (id: string, patch: TPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
  detailKey: (id: string | null | undefined) => QueryKey;
  listKey: () => QueryKey;
  getProjectId: (item: TModel) => string | null | undefined;
}

export interface EquipmentDetail<TModel extends { id: string }, TPatch, TCreate> {
  id: string | undefined;
  isPending: boolean;
  pendingCreate: TCreate | null;
  lazyCreate: (createFn: (data: TCreate) => Promise<{ id: string }>) => Promise<string | null>;
  item: TModel | null;
  project: Project | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  step: number;
  setStep: (step: number) => void;
  /** Direction of the last step change (1 = forward, -1 = back) for slide anim. */
  direction: number;
  /** Move to a step, recording the slide direction. */
  goStep: (step: number) => void;
  pdfOpen: boolean;
  setPdfOpen: (open: boolean) => void;
  justCompleted: boolean;
  /** Apply a patch (no-op while the row is still an unsaved draft). */
  save: (patch: TPatch) => void;
  updating: boolean;
  del: () => void;
  deleting: boolean;
  /** Query client, for the per-type first-edit commit path. */
  qc: ReturnType<typeof useQueryClient>;
}

export function useEquipmentDetail<TModel extends { id: string }, TPatch, TCreate>(
  cfg: EquipmentDetailConfig<TModel, TPatch>,
): EquipmentDetail<TModel, TPatch, TCreate> {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { pendingCreate, lazyCreate } = usePendingCreate<TCreate>();
  const isPending = id === 'draft';

  useEffect(() => {
    if (isPending && !pendingCreate) {
      navigate(routes.inspections.list(), { replace: true });
    }
  }, [isPending, pendingCreate, navigate]);

  const itemQuery = useEntityQuery<TModel | null>({
    queryKey: cfg.detailKey(id),
    queryFn: () => cfg.get(id!),
    enabled: !!id && !isPending,
  });
  const item = itemQuery.data ?? null;

  const projectId = item ? cfg.getProjectId(item) : null;
  const projectQuery = useEntityQuery<Project | null>({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  function goStep(next: number) {
    setDirection(next >= step ? 1 : -1);
    setStep(next);
  }

  const updateMutation = useEntityMutation<TPatch, void>({
    mutationFn: (patch) => cfg.update(id!, patch),
    invalidate: () => [cfg.detailKey(id), cfg.listKey()],
    onDone: (_data, patch) => {
      if ((patch as { status?: string }).status === 'completed') setJustCompleted(true);
    },
  });

  const delMutation = useEntityMutation<void, void>({
    mutationFn: () => cfg.remove(id!),
    invalidate: () => [cfg.listKey()],
    onDone: () => navigate(routes.inspections.list()),
  });

  function save(patch: TPatch) {
    if (isPending) return;
    updateMutation.mutate(patch);
  }

  return {
    id,
    isPending,
    pendingCreate,
    lazyCreate,
    item,
    project: projectQuery.data ?? null,
    isLoading: itemQuery.isLoading,
    isError: itemQuery.isError,
    error: itemQuery.error,
    step,
    setStep,
    direction,
    goStep,
    pdfOpen,
    setPdfOpen,
    justCompleted,
    save,
    updating: updateMutation.isPending,
    del: () => delMutation.mutate(),
    deleting: delMutation.isPending,
    qc,
  };
}
