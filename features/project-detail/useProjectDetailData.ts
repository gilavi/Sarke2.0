// Data layer for the project detail screen. Consolidates all React Query
// hooks + the `useEffect`s that mirror their results into local state.
//
// Why local state mirrors at all: the mutation paths (crew edit, file
// upload/delete, swipe-delete in the inspections sections) update the
// local copies directly and then optimistically refetch via React Query
// — the mirror keeps the UI responsive while the cache is being
// invalidated. Removing the mirror means refactoring every mutation
// site too; that's a separate change.
//
// One `loaded` flag aggregates `isLoading` across the eleven core
// queries — the screen waits for all of them before kicking off the
// arch entrance animation.

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useBobcatInspectionsByProject,
  useBreathalizerLogsByProject,
  useBriefingsByProject,
  useCargoPlatformInspectionsByProject,
  useExcavatorInspectionsByProject,
  useFallProtectionInspectionsByProject,
  useForkliftInspectionsByProject,
  useGeneralEquipmentInspectionsByProject,
  useIncidentsByProject,
  useInspectionsByProject,
  useLiftingAccessoriesInspectionsByProject,
  useMobileLadderInspectionsByProject,
  useProject,
  useProjectFiles,
  useReportsByProject,
  useSafetyNetInspectionsByProject,
  useTemplates,
} from '../../lib/apiHooks';
import { ordersApi } from '../../lib/ordersApi';
import type {
  Briefing,
  Incident,
  Order,
  Project,
  ProjectFile,
  Questionnaire,
  Report,
  Template,
} from '../../types/models';
import type { BreathalizerLog } from '../../types/breathalyzerLog';

export type ProjectDetailData = ReturnType<typeof useProjectDetailData>;

export function useProjectDetailData(id: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [bobcatInspections, setBobcatInspections] = useState<any[]>([]);
  const [excavatorInspections, setExcavatorInspections] = useState<any[]>([]);
  const [generalEquipmentInspections, setGeneralEquipmentInspections] = useState<any[]>([]);
  const [cpInspections, setCpInspections] = useState<any[]>([]);
  const [snInspections, setSnInspections] = useState<any[]>([]);
  const [mlInspections, setMlInspections] = useState<any[]>([]);
  const [fpInspections, setFpInspections] = useState<any[]>([]);
  const [laInspections, setLaInspections] = useState<any[]>([]);
  const [fkInspections, setFkInspections] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loaded, setLoaded] = useState(false);

  // React Query hooks provide cached data instantly + background refetch.
  // We sync their results into local state so existing mutations (crew edit,
  // file upload, etc.) continue to work via setProject / setFiles.
  const projectQ = useProject(id);
  const questionnairesQ = useInspectionsByProject(id);
  const bobcatQ = useBobcatInspectionsByProject(id);
  const excavatorQ = useExcavatorInspectionsByProject(id);
  const generalEquipmentQ = useGeneralEquipmentInspectionsByProject(id);
  const cpQ = useCargoPlatformInspectionsByProject(id);
  const snQ = useSafetyNetInspectionsByProject(id);
  const mlQ = useMobileLadderInspectionsByProject(id);
  const fpQ = useFallProtectionInspectionsByProject(id);
  const laQ = useLiftingAccessoriesInspectionsByProject(id);
  const fkQ = useForkliftInspectionsByProject(id);
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
  const incidents: Incident[] = incidentsQ.data ?? [];
  const briefings: Briefing[] = briefingsQ.data ?? [];
  const reports: Report[] = reportsQ.data ?? [];
  const orders: Order[] = ordersQ.data ?? [];
  const breathalyzerLogs: BreathalizerLog[] = breathalyzerLogsQ.data ?? [];

  useEffect(() => {
    if (projectQ.data !== undefined) setProject(projectQ.data);
  }, [projectQ.data]);
  useEffect(() => {
    if (questionnairesQ.data !== undefined) setQuestionnaires(questionnairesQ.data);
  }, [questionnairesQ.data]);
  useEffect(() => {
    if (bobcatQ.data !== undefined) setBobcatInspections(bobcatQ.data);
  }, [bobcatQ.data]);
  useEffect(() => {
    if (excavatorQ.data !== undefined) setExcavatorInspections(excavatorQ.data);
  }, [excavatorQ.data]);
  useEffect(() => {
    if (generalEquipmentQ.data !== undefined) setGeneralEquipmentInspections(generalEquipmentQ.data);
  }, [generalEquipmentQ.data]);
  useEffect(() => {
    if (cpQ.data !== undefined) setCpInspections(cpQ.data);
  }, [cpQ.data]);
  useEffect(() => {
    if (snQ.data !== undefined) setSnInspections(snQ.data);
  }, [snQ.data]);
  useEffect(() => {
    if (mlQ.data !== undefined) setMlInspections(mlQ.data);
  }, [mlQ.data]);
  useEffect(() => {
    if (fpQ.data !== undefined) setFpInspections(fpQ.data);
  }, [fpQ.data]);
  useEffect(() => {
    if (laQ.data !== undefined) setLaInspections(laQ.data);
  }, [laQ.data]);
  useEffect(() => {
    if (fkQ.data !== undefined) setFkInspections(fkQ.data);
  }, [fkQ.data]);
  useEffect(() => {
    if (templatesQ.data !== undefined) setTemplates(templatesQ.data);
  }, [templatesQ.data]);
  useEffect(() => {
    if (filesQ.data !== undefined) setFiles(filesQ.data);
  }, [filesQ.data]);
  useEffect(() => {
    const anyLoading = projectQ.isLoading || questionnairesQ.isLoading || bobcatQ.isLoading
      || excavatorQ.isLoading || generalEquipmentQ.isLoading || cpQ.isLoading || templatesQ.isLoading
      || filesQ.isLoading || incidentsQ.isLoading || briefingsQ.isLoading || reportsQ.isLoading;
    if (!anyLoading) setLoaded(true);
  }, [projectQ.isLoading, questionnairesQ.isLoading, bobcatQ.isLoading, excavatorQ.isLoading,
      generalEquipmentQ.isLoading, cpQ.isLoading, templatesQ.isLoading, filesQ.isLoading,
      incidentsQ.isLoading, briefingsQ.isLoading, reportsQ.isLoading]);

  return {
    loaded,
    project, setProject,
    questionnaires, setQuestionnaires,
    bobcatInspections, setBobcatInspections,
    excavatorInspections, setExcavatorInspections,
    generalEquipmentInspections, setGeneralEquipmentInspections,
    cpInspections, setCpInspections,
    snInspections, setSnInspections,
    mlInspections, setMlInspections,
    fpInspections, setFpInspections,
    laInspections, setLaInspections,
    fkInspections, setFkInspections,
    templates, setTemplates,
    files, setFiles,
    incidents,
    briefings,
    reports,
    orders,
    breathalyzerLogs,
  };
}
