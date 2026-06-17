/**
 * Reusable TanStack Query hooks for the Hubble API.
 *
 * These wrap the raw API calls with caching, deduplication, stale-time
 * management, and background revalidation. Converting screens from raw
 * useState/useEffect/useFocusEffect to these hooks eliminates the
 * re-fetch-on-every-focus anti-pattern and makes tab-switching instant.
 *
 * Query keys are stable and documented so callers can invalidate them
 * after mutations.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  projectsApi,
  projectFilesApi,
  templatesApi,
  inspectionsApi,
  answersApi,
  qualificationsApi,
  certificatesApi,
  projectItemsApi,
  schedulesApi,
  incidentsApi,
  reportsApi,
  remoteSigningApi,
  paymentRecordsApi,
} from './services';
import { briefingsApi } from './briefingsApi';
import { bobcatApi } from './bobcatService';
import { excavatorApi } from './excavatorService';
import { generalEquipmentApi } from './generalEquipmentService';
import { cargoPlatformApi } from './cargoPlatformService';
import { safetyNetApi } from './safetyNetService';
import { mobileLadderApi } from './mobileLadderService';
import { fallProtectionApi } from './fallProtectionService';
import { liftingAccessoriesApi } from './liftingAccessoriesService';
import { forkliftApi } from './forkliftService';
import { breathalyzerLogApi } from './breathalyzerLogService';
import type { BreathalizerLog } from '../types/breathalyzerLog';
import type {
  Project,
  ProjectFile,
  Template,
  Inspection,
  Answer,
  Qualification,
  Certificate,
  ProjectItem,
  ScheduleWithItem,
  Incident,
  PaymentRecord,
  Report,
  Briefing,
} from '../types/models';

// ── Query Keys (stable, documented, invalidate-targets) ──────────────────────

export const qk = {
  projects: {
    list: ['projects', 'list'] as const,
    stats: ['projects', 'stats'] as const,
    overdueCounts: ['projects', 'overdueCounts'] as const,
    byId: (id: string) => ['projects', 'detail', id] as const,
    files: (id: string) => ['projects', 'files', id] as const,
    items: (id: string) => ['projects', 'items', id] as const,
    signers: (id: string) => ['projects', 'signers', id] as const,
    inspections: (id: string) => ['projects', 'inspections', id] as const,
    incidents: (id: string) => ['projects', 'incidents', id] as const,
    briefings: (id: string) => ['projects', 'briefings', id] as const,
    reports: (id: string) => ['projects', 'reports', id] as const,
  },
  templates: {
    list: ['templates', 'list'] as const,
    byId: (id: string) => ['templates', 'detail', id] as const,
    questions: (id: string) => ['templates', 'questions', id] as const,
  },
  inspections: {
    recent: (limit: number) => ['inspections', 'recent', limit] as const,
    byId: (id: string) => ['inspections', 'detail', id] as const,
    byProject: (projectId: string) => ['inspections', 'byProject', projectId] as const,
    unifiedByProject: (id: string) => ['inspections', 'unifiedByProject', id] as const,
    answers: (id: string) => ['inspections', 'answers', id] as const,
    photos: (id: string) => ['inspections', 'photos', id] as const,
  },
  bobcat: {
    byProject: (projectId: string) => ['bobcat', 'byProject', projectId] as const,
  },
  excavator: {
    byProject: (projectId: string) => ['excavator', 'byProject', projectId] as const,
  },
  generalEquipment: {
    byProject: (projectId: string) => ['generalEquipment', 'byProject', projectId] as const,
  },
  cargoPlatform: {
    byProject: (projectId: string) => ['cargoPlatform', 'byProject', projectId] as const,
  },
  safetyNet: {
    byProject: (projectId: string) => ['safetyNet', 'byProject', projectId] as const,
  },
  mobileLadder: {
    byProject: (projectId: string) => ['mobileLadder', 'byProject', projectId] as const,
  },
  fallProtection: {
    byProject: (projectId: string) => ['fallProtection', 'byProject', projectId] as const,
  },
  liftingAccessories: {
    byProject: (projectId: string) => ['liftingAccessories', 'byProject', projectId] as const,
  },
  forklift: {
    byProject: (projectId: string) => ['forklift', 'byProject', projectId] as const,
  },
  breathalyzerLog: {
    byProject: (projectId: string) => ['breathalyzerLog', 'byProject', projectId] as const,
  },
  qualifications: {
    list: ['qualifications', 'list'] as const,
  },
  certificates: {
    list: ['certificates', 'list'] as const,
    byInspection: (id: string) => ['certificates', 'byInspection', id] as const,
    byId: (id: string) => ['certificates', 'detail', id] as const,
  },
  incidents: {
    byId: (id: string) => ['incidents', 'detail', id] as const,
    byProject: (projectId: string) => ['incidents', 'byProject', projectId] as const,
  },
  reports: {
    byId: (id: string) => ['reports', 'detail', id] as const,
    byProject: (projectId: string) => ['reports', 'byProject', projectId] as const,
  },
  briefings: {
    byId: (id: string) => ['briefings', 'detail', id] as const,
    byProject: (projectId: string) => ['briefings', 'byProject', projectId] as const,
  },
  schedules: {
    list: ['schedules', 'list'] as const,
    upcoming: (from: string, to: string) => ['schedules', 'upcoming', from, to] as const,
  },
  calendar: {
    allInspections: ['calendar', 'allInspections'] as const,
    allBriefings: ['calendar', 'allBriefings'] as const,
    schedules: ['calendar', 'schedules'] as const,
  },
};

// ── Projects ─────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: qk.projects.list,
    queryFn: () => projectsApi.list(),
  });
}

export function useProject(id: string | undefined) {
  return useQuery<Project | null>({
    queryKey: id ? qk.projects.byId(id) : ['projects', 'detail', 'none'],
    queryFn: () => (id ? projectsApi.getById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useProjectStats() {
  return useQuery<Record<string, { drafts: number; completed: number }>>({
    queryKey: qk.projects.stats,
    queryFn: () => projectsApi.stats(),
  });
}

export function useProjectFiles(projectId: string | undefined) {
  return useQuery<ProjectFile[]>({
    queryKey: projectId ? qk.projects.files(projectId) : ['projects', 'files', 'none'],
    queryFn: () => (projectId ? projectFilesApi.list(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useProjectItems(projectId: string | undefined) {
  return useQuery<ProjectItem[]>({
    queryKey: projectId ? qk.projects.items(projectId) : ['projects', 'items', 'none'],
    queryFn: () => (projectId ? projectItemsApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useProjectSigners(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.projects.signers(projectId) : ['projects', 'signers', 'none'],
    queryFn: () => (projectId ? projectsApi.signers(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

// ── Templates ────────────────────────────────────────────────────────────────

export function useTemplates() {
  return useQuery<Template[]>({
    queryKey: qk.templates.list,
    queryFn: () => templatesApi.list(),
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery<Template | null>({
    queryKey: id ? qk.templates.byId(id) : ['templates', 'detail', 'none'],
    queryFn: () => (id ? templatesApi.getById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useTemplateQuestions(templateId: string | undefined) {
  return useQuery({
    queryKey: templateId ? qk.templates.questions(templateId) : ['templates', 'questions', 'none'],
    queryFn: () => (templateId ? templatesApi.questions(templateId) : Promise.resolve([])),
    enabled: !!templateId,
  });
}

// ── Inspections ──────────────────────────────────────────────────────────────

export function useRecentInspections(limit = 10) {
  return useQuery<Inspection[]>({
    queryKey: qk.inspections.recent(limit),
    queryFn: () => inspectionsApi.recent(limit),
  });
}

export function useInspection(id: string | undefined) {
  return useQuery<Inspection | null>({
    queryKey: id ? qk.inspections.byId(id) : ['inspections', 'detail', 'none'],
    queryFn: () => (id ? inspectionsApi.getById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useInspectionsByProject(projectId: string | undefined) {
  return useQuery<Inspection[]>({
    queryKey: projectId ? qk.inspections.byProject(projectId) : ['inspections', 'byProject', 'none'],
    queryFn: () => (projectId ? inspectionsApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

// Unified per-project inspection list. Backed by the
// get_project_inspections_unified() RPC - one row per inspection across
// generic + all 9 equipment-type tables. The project-detail screen uses this
// instead of firing 10 parallel `useXxxInspectionsByProject` queries.
export type UnifiedInspectionPreview = {
  id: string;
  source: string;
  template_id: string;
  status: 'draft' | 'completed';
  created_at: string;
};

export function useUnifiedInspectionsByProject(projectId: string | undefined) {
  return useQuery<UnifiedInspectionPreview[]>({
    queryKey: projectId ? qk.inspections.unifiedByProject(projectId) : ['inspections', 'unifiedByProject', 'none'],
    queryFn: () => (projectId ? inspectionsApi.unifiedByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useInspectionAnswers(inspectionId: string | undefined) {
  return useQuery<Answer[]>({
    queryKey: inspectionId ? qk.inspections.answers(inspectionId) : ['inspections', 'answers', 'none'],
    queryFn: () => (inspectionId ? answersApi.list(inspectionId) : Promise.resolve([])),
    enabled: !!inspectionId,
  });
}

// ── Equipment inspections ────────────────────────────────────────────────────

export function useBobcatInspectionsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.bobcat.byProject(projectId) : ['bobcat', 'byProject', 'none'],
    queryFn: () => (projectId ? bobcatApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useExcavatorInspectionsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.excavator.byProject(projectId) : ['excavator', 'byProject', 'none'],
    queryFn: () => (projectId ? excavatorApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useGeneralEquipmentInspectionsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.generalEquipment.byProject(projectId) : ['generalEquipment', 'byProject', 'none'],
    queryFn: () => (projectId ? generalEquipmentApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useCargoPlatformInspectionsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.cargoPlatform.byProject(projectId) : ['cargoPlatform', 'byProject', 'none'],
    queryFn: () => (projectId ? cargoPlatformApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useSafetyNetInspectionsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.safetyNet.byProject(projectId) : ['safetyNet', 'byProject', 'none'],
    queryFn: () => (projectId ? safetyNetApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useMobileLadderInspectionsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.mobileLadder.byProject(projectId) : ['mobileLadder', 'byProject', 'none'],
    queryFn: () => (projectId ? mobileLadderApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useFallProtectionInspectionsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.fallProtection.byProject(projectId) : ['fallProtection', 'byProject', 'none'],
    queryFn: () => (projectId ? fallProtectionApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useLiftingAccessoriesInspectionsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.liftingAccessories.byProject(projectId) : ['liftingAccessories', 'byProject', 'none'],
    queryFn: () => (projectId ? liftingAccessoriesApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useForkliftInspectionsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? qk.forklift.byProject(projectId) : ['forklift', 'byProject', 'none'],
    queryFn: () => (projectId ? forkliftApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

// ── Qualifications ───────────────────────────────────────────────────────────

export function useQualifications() {
  return useQuery<Qualification[]>({
    queryKey: qk.qualifications.list,
    queryFn: () => qualificationsApi.list(),
  });
}

// ── Certificates ─────────────────────────────────────────────────────────────

export function useCertificates() {
  return useQuery<Certificate[]>({
    queryKey: qk.certificates.list,
    queryFn: () => certificatesApi.list(),
  });
}

export function useCertificatesByInspection(inspectionId: string | undefined) {
  return useQuery<Certificate[]>({
    queryKey: inspectionId
      ? qk.certificates.byInspection(inspectionId)
      : ['certificates', 'byInspection', 'none'],
    queryFn: () => (inspectionId ? certificatesApi.listByInspection(inspectionId) : Promise.resolve([])),
    enabled: !!inspectionId,
  });
}

export function useCertificateCounts(inspectionIds: string[]) {
  return useQuery<Record<string, number>>({
    queryKey: ['certificates', 'counts', ...inspectionIds.sort()] as const,
    queryFn: () => (inspectionIds.length > 0 ? certificatesApi.countsByInspection(inspectionIds) : Promise.resolve({})),
    enabled: inspectionIds.length > 0,
  });
}

// ── Incidents ─────────────────────────────────────────────────────────────────

export function useIncident(id: string | undefined) {
  return useQuery<Incident | null>({
    queryKey: id ? qk.incidents.byId(id) : ['incidents', 'detail', 'none'],
    queryFn: () => (id ? incidentsApi.getById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useIncidentsByProject(projectId: string | undefined) {
  return useQuery<Incident[]>({
    queryKey: projectId ? qk.incidents.byProject(projectId) : ['incidents', 'byProject', 'none'],
    queryFn: () => (projectId ? incidentsApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

// ── Reports ──────────────────────────────────────────────────────────────────

export function useReport(id: string | undefined) {
  return useQuery<Report | null>({
    queryKey: id ? qk.reports.byId(id) : ['reports', 'detail', 'none'],
    queryFn: () => (id ? reportsApi.getById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useReportsByProject(projectId: string | undefined) {
  return useQuery<Report[]>({
    queryKey: projectId ? qk.reports.byProject(projectId) : ['reports', 'byProject', 'none'],
    queryFn: () => (projectId ? reportsApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

// ── Briefings ─────────────────────────────────────────────────────────────────

export function useBriefing(id: string | undefined) {
  return useQuery<Briefing | null>({
    queryKey: id ? qk.briefings.byId(id) : ['briefings', 'detail', 'none'],
    queryFn: () => (id ? briefingsApi.getById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useBriefingsByProject(projectId: string | undefined) {
  return useQuery<Briefing[]>({
    queryKey: projectId ? qk.briefings.byProject(projectId) : ['briefings', 'byProject', 'none'],
    queryFn: () => (projectId ? briefingsApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

// ── Schedules ─────────────────────────────────────────────────────────────────

export function useSchedules() {
  return useQuery<ScheduleWithItem[]>({
    queryKey: qk.schedules.list,
    queryFn: () => schedulesApi.list(),
  });
}

export function useInspectionCounts() {
  return useQuery<{
    total: number;
    drafts: number;
    completed: number;
    latestCreatedAt: string | null;
  }>({
    queryKey: ['inspections', 'counts'] as const,
    queryFn: () => inspectionsApi.counts(),
  });
}

export function useRemoteSigningRequests(inspectionId: string | undefined) {
  return useQuery({
    queryKey: inspectionId ? ['remoteSigning', 'byInspection', inspectionId] : ['remoteSigning', 'none'],
    queryFn: () => (inspectionId ? remoteSigningApi.listByInspection(inspectionId) : Promise.resolve([])),
    enabled: !!inspectionId,
  });
}

export function useUpcomingSchedules(fromIso: string, toIso: string) {
  return useQuery<ScheduleWithItem[]>({
    queryKey: qk.schedules.upcoming(fromIso, toIso),
    queryFn: () => schedulesApi.upcoming(fromIso, toIso),
    enabled: !!fromIso && !!toIso,
  });
}

// ── Calendar ──────────────────────────────────────────────────────────────────

import { getStore } from './calendarSchedule';
import { buildCalendarEvents, getOverdueCount } from './calendarEvents';
import type { ScheduleStore } from './calendarSchedule';
import type { CalendarEvent } from './calendarEvents';

export function useAllInspections() {
  return useQuery<Inspection[]>({
    queryKey: qk.calendar.allInspections,
    queryFn: () => inspectionsApi.listAll(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllBriefings() {
  return useQuery<Briefing[]>({
    queryKey: qk.calendar.allBriefings,
    queryFn: () => briefingsApi.listAll(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCalendarSchedules() {
  return useQuery<ScheduleStore>({
    queryKey: qk.calendar.schedules,
    queryFn: () => getStore(),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Returns derived CalendarEvent[]. Plain hook (not a useQuery) so it
 * automatically reacts to any of its five dependencies updating.
 */
export function useCalendarEvents(): CalendarEvent[] {
  const { data: inspections = [] } = useAllInspections();
  const { data: briefings = [] } = useAllBriefings();
  const { data: templates = [] } = useTemplates();
  const { data: projects = [] } = useProjects();
  const { data: store } = useCalendarSchedules();

  return useMemo(
    () =>
      buildCalendarEvents(
        inspections,
        briefings,
        templates,
        projects,
        store ?? { inspections: {}, briefings: {} },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspections, briefings, templates, projects, store],
  );
}

/** Overdue + due-today count - drives the tab bar badge. */
export function useOverdueCount(): number {
  const events = useCalendarEvents();
  return useMemo(() => getOverdueCount(events), [events]);
}

export function usePaymentHistory() {
  return useQuery<PaymentRecord[]>({
    queryKey: ['paymentRecords', 'list'] as const,
    queryFn: () => paymentRecordsApi.list(),
  });
}

// ── Breathalyzer Logs ─────────────────────────────────────────────────────────

export function useBreathalizerLogsByProject(projectId: string | undefined) {
  return useQuery<BreathalizerLog[]>({
    queryKey: projectId
      ? qk.breathalyzerLog.byProject(projectId)
      : ['breathalyzerLog', 'byProject', 'none'],
    queryFn: () =>
      projectId
        ? breathalyzerLogApi.listByProject(projectId)
        : Promise.resolve([]),
    enabled: !!projectId,
  });
}
