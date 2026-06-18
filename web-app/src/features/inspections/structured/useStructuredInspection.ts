/**
 * Lifecycle hook for the unified structured-inspection wizard.
 *
 * Generalizes the equipment-detail lifecycle (useEquipmentDetail) for the
 * harness-style create pattern the project standardized on: the row is created
 * when the user leaves the info/specs step (no `/<type>/draft` dead-end). It
 * owns: the create-vs-edit mode, the item/project queries, the patch + delete
 * mutations with cache invalidation, the step/direction state, and the in-memory
 * signature session (regulatory: never persisted - handed to the print route via
 * router state only).
 */
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEntityQuery } from '@/lib/query/useEntityQuery';
import { useEntityMutation } from '@/lib/query/useEntityMutation';
import { getProject, type Project } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import type { SignaturesSectionData } from '@/lib/inspection/renderSignaturesSection';
import type { WizardDescriptor } from './types';

export interface StructuredInspection<T extends { id: string; status: string }, P> {
  /** 'new' (not yet created) or a real id. */
  isNew: boolean;
  id: string | undefined;
  item: T | null;
  project: Project | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;

  step: number;
  direction: number;
  goStep: (next: number) => void;

  /** Persist a patch (no-op while still in create mode with no row). */
  save: (patch: P) => void;
  updating: boolean;
  /** Create the row from the specs form, then navigate to its detail route. */
  create: (input: { projectId: string; inspectorName: string | null; specValues: Record<string, string> }) => Promise<T | null>;
  creating: boolean;
  /** Mark the row completed and resolve once persisted (awaitable). */
  complete: () => Promise<void>;
  del: () => void;
  deleting: boolean;

  /** In-memory captured-signature session for the PDF (never persisted). */
  signaturesSession: SignaturesSectionData | null;
  setSignaturesSession: (s: SignaturesSectionData | null) => void;
}

export function useStructuredInspection<T extends { id: string; status: string }, P, C>(
  descriptor: WizardDescriptor<T, P, C>,
  detailRoute: (id: string) => string,
): StructuredInspection<T, P> {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !id || id === 'new';

  const itemQuery = useEntityQuery<T | null>({
    queryKey: descriptor.detailKey(id),
    queryFn: () => descriptor.get(id!),
    enabled: !isNew,
  });
  const item = itemQuery.data ?? null;

  const projectId = item ? descriptor.getProjectId(item) : null;
  const projectQuery = useEntityQuery<Project | null>({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [signaturesSession, setSignaturesSession] = useState<SignaturesSectionData | null>(null);

  const goStep = useCallback((next: number) => {
    setDirection((d) => (next >= step ? 1 : -1) || d);
    setStep(next);
  }, [step]);

  const updateMutation = useEntityMutation<P, void>({
    mutationFn: (patch) => descriptor.update(id!, patch),
    invalidate: () => [descriptor.detailKey(id), descriptor.listKey()],
  });

  const delMutation = useEntityMutation<void, void>({
    mutationFn: () => descriptor.remove(id!),
    invalidate: () => [descriptor.listKey()],
    onDone: () => navigate('/inspections'),
  });

  const save = useCallback((patch: P) => {
    if (isNew) return;
    updateMutation.mutate(patch);
  }, [isNew, updateMutation]);

  const complete = useCallback(async () => {
    if (isNew) return;
    await updateMutation.mutateAsync(descriptor.completePatch());
  }, [isNew, updateMutation, descriptor]);

  const [creating, setCreating] = useState(false);
  const create = useCallback(
    async (input: { projectId: string; inspectorName: string | null; specValues: Record<string, string> }) => {
      setCreating(true);
      try {
        const created = await descriptor.create(descriptor.buildCreateArgs(input));
        qc.invalidateQueries({ queryKey: descriptor.listKey() });
        // Replace the create URL with the real detail route so refresh/back work
        // and the lifecycle switches to edit mode against the persisted row.
        navigate(detailRoute(created.id), { replace: true });
        return created;
      } finally {
        setCreating(false);
      }
    },
    [descriptor, qc, navigate, detailRoute],
  );

  return {
    isNew,
    id,
    item,
    project: projectQuery.data ?? null,
    isLoading: itemQuery.isLoading,
    isError: itemQuery.isError,
    error: itemQuery.error,
    step,
    direction,
    goStep,
    save,
    updating: updateMutation.isPending,
    create,
    creating,
    complete,
    del: () => delMutation.mutate(),
    deleting: delMutation.isPending,
    signaturesSession,
    setSignaturesSession,
  };
}
