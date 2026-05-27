// Data layer for the project detail screen. Consolidates the React Query
// hooks + the `useEffect`s that mirror their results into local state.
//
// Why local state mirrors at all: the mutation paths (crew edit, file
// upload/delete) update the local copies directly while React Query refetches
// in the background — the mirror keeps the UI responsive. Removing the mirror
// means refactoring every mutation site too; that's a separate change.
//
// `loaded` flips true as soon as the project itself resolves so the hero
// + arch entrance animate immediately. Each section consumes its own
// `pending.<section>` flag from the returned object and renders its own
// skeleton until that specific query lands — so slow sections never block
// fast ones from painting.
//
// Inspections used to fire 10 parallel per-type queries (generic + 9
// equipment tables) plus a templates query. After the 2026-05-27 identity
// unification, every equipment row has a parent row in public.inspections
// tagged with `type`, so a single RPC (get_project_inspections_unified)
// returns the full preview list. The mirrored local arrays and per-type
// setters are gone — swipe-delete now mutates the unified-query cache via
// queryClient.setQueryData.

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useBreathalizerLogsByProject,
  useBriefingsByProject,
  useIncidentsByProject,
  useProject,
  useProjectFiles,
  useReportsByProject,
  useTemplates,
  useUnifiedInspectionsByProject,
  type UnifiedInspectionPreview,
} from '../../lib/apiHooks';
import { ordersApi } from '../../lib/ordersApi';
import type {
  Briefing,
  Incident,
  Order,
  Project,
  ProjectFile,
  Report,
  Template,
} from '../../types/models';
import type { BreathalizerLog } from '../../types/breathalyzerLog';

export type ProjectDetailData = ReturnType<typeof useProjectDetailData>;

export function useProjectDetailData(id: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);

  // React Query hooks provide cached data instantly + background refetch.
  // We sync project / templates / files into local state because the
  // mutation paths (crew edit, file upload/delete) update them directly.
  const projectQ = useProject(id);
  const inspectionsQ = useUnifiedInspectionsByProject(id);
  const templatesQ = useTemplates();
  const filesQ = useProjectFiles(id);
  const incidentsQ = useIncidentsByProject(id);
  const briefingsQ = useBriefingsByProject(id);
  const reportsQ = useReportsByProject(id);
  const ordersQ = useQuery<Order[]>({
    queryKey: ['orders', 'byProject', id],
    queryFn: () => (id ? ordersApi.listByProject(id) : Promise.resolve([])),
    enabled: !!id,
  });
  const breathalyzerLogsQ = useBreathalizerLogsByProject(id);

  // Read-only data consumed directly from the query cache (no local state needed)
  const inspections: UnifiedInspectionPreview[] = inspectionsQ.data ?? [];
  const incidents: Incident[] = incidentsQ.data ?? [];
  const briefings: Briefing[] = briefingsQ.data ?? [];
  const reports: Report[] = reportsQ.data ?? [];
  const orders: Order[] = ordersQ.data ?? [];
  const breathalyzerLogs: BreathalizerLog[] = breathalyzerLogsQ.data ?? [];

  useEffect(() => {
    if (projectQ.data !== undefined) setProject(projectQ.data);
  }, [projectQ.data]);
  useEffect(() => {
    if (templatesQ.data !== undefined) setTemplates(templatesQ.data);
  }, [templatesQ.data]);
  useEffect(() => {
    if (filesQ.data !== undefined) setFiles(filesQ.data);
  }, [filesQ.data]);

  // `loaded` flips true as soon as the project itself resolves. Hero/arch
  // entrance animation depends on this so it fires fast — slow side queries
  // don't gate the screen render.
  const loaded = projectQ.data !== undefined || projectQ.isError;

  // Per-section pending flags. Sections render their own skeleton while
  // their own data is in flight; one slow query doesn't block the others.
  const pending = {
    project: projectQ.isPending,
    inspections: inspectionsQ.isPending,
    incidents: incidentsQ.isPending,
    briefings: briefingsQ.isPending,
    reports: reportsQ.isPending,
    files: filesQ.isPending,
    orders: ordersQ.isPending,
    breathalyzer: breathalyzerLogsQ.isPending,
  } as const;

  return {
    loaded,
    pending,
    project, setProject,
    inspections,
    templates, setTemplates,
    files, setFiles,
    incidents,
    briefings,
    reports,
    orders,
    breathalyzerLogs,
  };
}
