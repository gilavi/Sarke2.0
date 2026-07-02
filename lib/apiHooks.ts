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
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
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
import { ordersApi } from './ordersApi';
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
import { riskAssessmentApi } from './riskAssessmentService';
import type { RiskAssessment } from '../types/riskAssessment';
// Leaf import (recordTypes only pulls lucide icons — no cycle back into lib).
// Keeps the Home warm-up's record-list keys in lock-step with the widgets that
// read them, so the prefetch and the mount-time query share one cache entry.
import { RECENT_COMPLETED_LIMIT } from '../features/records/recordTypes';
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
  Order,
  RecentRecordsOpts,
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
    recent: (arg?: number | RecentRecordsOpts) => {
      const o = typeof arg === 'number' ? { limit: arg } : (arg ?? {});
      return ['inspections', 'recent', o.status ?? 'all', o.limit ?? 'all'] as const;
    },
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
  equipmentInspection: {
    /** Detail row for any equipment type; `type` is the InspectionSchema.category tag. */
    byId: (type: string, id: string) => ['equipmentInspection', 'detail', type, id] as const,
  },
  breathalyzerLog: {
    byProject: (projectId: string) => ['breathalyzerLog', 'byProject', projectId] as const,
    byId: (id: string) => ['breathalyzerLog', 'byId', id] as const,
    byDate: (projectId: string, date: string) =>
      ['breathalyzerLog', 'byDate', projectId, date] as const,
  },
  riskAssessment: {
    byProject: (projectId: string) => ['riskAssessment', 'byProject', projectId] as const,
    byId: (id: string) => ['riskAssessment', 'byId', id] as const,
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
    recent: (opts?: RecentRecordsOpts) => ['incidents', 'recent', opts?.status ?? 'all', opts?.limit ?? 'all'] as const,
  },
  reports: {
    byId: (id: string) => ['reports', 'detail', id] as const,
    byProject: (projectId: string) => ['reports', 'byProject', projectId] as const,
    recent: (opts?: RecentRecordsOpts) => ['reports', 'recent', opts?.status ?? 'all', opts?.limit ?? 'all'] as const,
  },
  briefings: {
    byId: (id: string) => ['briefings', 'detail', id] as const,
    byProject: (projectId: string) => ['briefings', 'byProject', projectId] as const,
    recent: (opts?: RecentRecordsOpts) => ['briefings', 'recent', opts?.status ?? 'all', opts?.limit ?? 'all'] as const,
  },
  orders: {
    byId: (id: string) => ['orders', 'detail', id] as const,
    byProject: (projectId: string) => ['orders', 'byProject', projectId] as const,
    recent: (opts?: RecentRecordsOpts) => ['orders', 'recent', opts?.status ?? 'all', opts?.limit ?? 'all'] as const,
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

/**
 * Invalidate every list/preview query that surfaces records, so Home, History,
 * and project-detail refresh after any create / finish / delete. Broad top-level
 * keys (partial match) cover `recent`, `byProject`, `unifiedByProject`, `byId`,
 * `list`, and `stats` for each namespace in a single call — a mutation never has
 * to know which screens are mounted.
 *
 * This is the CANONICAL post-mutation step: call it after every record
 * create / finish / delete. `invalidateQueries` refetches the currently-mounted
 * lists immediately and marks the rest stale so they refetch on next view. Pair
 * with the focusManager↔AppState binding in `lib/queryClient.ts`, which refreshes
 * stale queries when the app returns to the foreground.
 */
export function invalidateRecordLists(qc: QueryClient): Promise<void> {
  const namespaces = [
    'inspections',
    'reports',
    'orders',
    'briefings',
    'incidents',
    'breathalyzerLog',
    'riskAssessment',
    'certificates',
    'projects',
    'schedules',
    'calendar',
  ];
  // Returns an awaitable so callers that want to gate a spinner on the refetch
  // (e.g. Home's pull-to-refresh) can `await` it; fire-and-forget callers simply
  // ignore the promise. Resolves once every matching active query has refetched.
  return Promise.all(
    namespaces.map((ns) => qc.invalidateQueries({ queryKey: [ns] })),
  ).then(() => undefined);
}

/**
 * Force-refetch every query the Home screen reads, bypassing `staleTime`.
 *
 * Called from the post-login flow in `lib/session.tsx` once the JWT is provably
 * live (the users-row fetch in `safeLoadUser` has already succeeded). `staleTime: 0`
 * guarantees a network round-trip even when a cached value exists — without it a
 * query that earlier raced JWT propagation and cached an RLS-empty `[]` stays
 * "fresh" for the 5-minute default staleTime, leaving Home showing projects (warmed
 * here since 2026-05-27) but no record widgets. Warming the record-list keys too
 * closes that gap (see `docs/reports/BUG_REPORT.md`, "Home shows empty projects
 * after first login").
 *
 * Fire-and-forget: do NOT await it — a network blip must not delay post-auth nav.
 * Each prefetch swallows its own error so one failing call can't reject the rest.
 */
export function warmHomeCaches(qc: QueryClient): void {
  const recent = { status: 'completed' as const, limit: RECENT_COMPLETED_LIMIT };
  // The Resume-draft card reads the single most-recent draft inspection — a
  // different key from the completed feeds, but the same race, so warm it too.
  const draft = { status: 'draft' as const, limit: 1 };
  const jobs: Array<{ queryKey: readonly unknown[]; queryFn: () => Promise<unknown> }> = [
    { queryKey: qk.projects.list, queryFn: () => projectsApi.list() },
    { queryKey: qk.qualifications.list, queryFn: () => qualificationsApi.list() },
    { queryKey: qk.templates.list, queryFn: () => templatesApi.list() },
    { queryKey: qk.inspections.recent(recent), queryFn: () => inspectionsApi.recent(recent) },
    { queryKey: qk.inspections.recent(draft), queryFn: () => inspectionsApi.recent(draft) },
    { queryKey: qk.reports.recent(recent), queryFn: () => reportsApi.recent(recent) },
    { queryKey: qk.orders.recent(recent), queryFn: () => ordersApi.recent(recent) },
    { queryKey: qk.incidents.recent(recent), queryFn: () => incidentsApi.recent(recent) },
    { queryKey: qk.briefings.recent(recent), queryFn: () => briefingsApi.recent(recent) },
  ];
  for (const job of jobs) {
    void qc.prefetchQuery({ ...job, staleTime: 0 }).catch(() => undefined);
  }
}

/**
 * Warm the caches document-creation flows read at their START, so every flow
 * can open fully offline later (see lib/cachedRead.ts):
 *
 *   - every template's question set (the inspection wizard can't render
 *     without one) — effectively static, so 12h staleTime, fetched ≤3 at a
 *     time (~12 live templates);
 *   - a per-project detail cache entry seeded from the projects list, for
 *     flow headers/autofill. Shape-safe: list() and getById() both
 *     `select('*')` and apply the same crew mapping (lib/services/real/projects.ts).
 *
 * Fire-and-forget; called after warmHomeCaches() post-login (lib/session.tsx)
 * and on reconnect (lib/offline.tsx). Both list fetches dedupe against the
 * warm-up's in-flight prefetches of the same keys.
 */
export function prefetchFlowStartCaches(qc: QueryClient): void {
  const QUESTIONS_STALE_MS = 12 * 60 * 60 * 1000;
  void qc
    .fetchQuery({ queryKey: qk.templates.list, queryFn: () => templatesApi.list() })
    .then(async (templates) => {
      const ids = (templates ?? []).map((t) => t.id);
      for (let i = 0; i < ids.length; i += 3) {
        await Promise.all(
          ids.slice(i, i + 3).map((tid) =>
            qc
              .prefetchQuery({
                queryKey: qk.templates.questions(tid),
                queryFn: () => templatesApi.questions(tid),
                staleTime: QUESTIONS_STALE_MS,
              })
              .catch(() => undefined),
          ),
        );
      }
    })
    .catch(() => undefined);
  void qc
    .fetchQuery({ queryKey: qk.projects.list, queryFn: () => projectsApi.list() })
    .then((projects) => {
      for (const p of projects ?? []) qc.setQueryData(qk.projects.byId(p.id), p);
    })
    .catch(() => undefined);
}

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

export function useRecentInspections(arg?: number | RecentRecordsOpts) {
  const opts: RecentRecordsOpts = typeof arg === 'number' ? { limit: arg } : (arg ?? {});
  return useQuery<Inspection[]>({
    queryKey: qk.inspections.recent(opts),
    queryFn: () => inspectionsApi.recent(opts),
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

/** Cross-project recent incidents (RLS-scoped to the signed-in user). */
export function useRecentIncidents(opts: RecentRecordsOpts = {}) {
  return useQuery<Incident[]>({
    queryKey: qk.incidents.recent(opts),
    queryFn: () => incidentsApi.recent(opts),
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

/** Cross-project recent reports (RLS-scoped to the signed-in user). */
export function useRecentReports(opts: RecentRecordsOpts = {}) {
  return useQuery<Report[]>({
    queryKey: qk.reports.recent(opts),
    queryFn: () => reportsApi.recent(opts),
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

/** Cross-project recent briefings (RLS-scoped to the signed-in user). */
export function useRecentBriefings(opts: RecentRecordsOpts = {}) {
  return useQuery<Briefing[]>({
    queryKey: qk.briefings.recent(opts),
    queryFn: () => briefingsApi.recent(opts),
  });
}

// ── Orders (ბრძანება) ──────────────────────────────────────────────────────────

export function useOrdersByProject(projectId: string | undefined) {
  return useQuery<Order[]>({
    queryKey: projectId ? qk.orders.byProject(projectId) : ['orders', 'byProject', 'none'],
    queryFn: () => (projectId ? ordersApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

/** Cross-project recent orders/brdzaneba (RLS-scoped to the signed-in user). */
export function useRecentOrders(opts: RecentRecordsOpts = {}) {
  return useQuery<Order[]>({
    queryKey: qk.orders.recent(opts),
    queryFn: () => ordersApi.recent(opts),
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

/** A single breathalyzer log by id (historical / deep-linked view). */
export function useBreathalyzerLog(logId: string | undefined) {
  return useQuery<BreathalizerLog | null>({
    queryKey: logId ? qk.breathalyzerLog.byId(logId) : ['breathalyzerLog', 'byId', 'none'],
    queryFn: () => (logId ? breathalyzerLogApi.getById(logId) : Promise.resolve(null)),
    enabled: !!logId,
  });
}

/** The breathalyzer log for a project on a given date (today's log on the main screen). */
export function useBreathalyzerLogByDate(projectId: string | undefined, date: string) {
  return useQuery<BreathalizerLog | null>({
    queryKey: projectId
      ? qk.breathalyzerLog.byDate(projectId, date)
      : ['breathalyzerLog', 'byDate', 'none'],
    queryFn: () =>
      projectId ? breathalyzerLogApi.getByProjectAndDate(projectId, date) : Promise.resolve(null),
    enabled: !!projectId,
  });
}

// ── Risk Assessments (რისკების შეფასება) ───────────────────────────────────────

export function useRiskAssessmentsByProject(projectId: string | undefined) {
  return useQuery<RiskAssessment[]>({
    queryKey: projectId
      ? qk.riskAssessment.byProject(projectId)
      : ['riskAssessment', 'byProject', 'none'],
    queryFn: () => (projectId ? riskAssessmentApi.listByProject(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
}

export function useRiskAssessment(id: string | undefined) {
  return useQuery<RiskAssessment | null>({
    queryKey: id ? qk.riskAssessment.byId(id) : ['riskAssessment', 'byId', 'none'],
    queryFn: () => (id ? riskAssessmentApi.getById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}
