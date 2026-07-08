import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { IncidentRow } from '../../components/projects/ProjectRowHelpers';
import { useProjects } from '../../lib/apiHooks';
import {
  INCIDENT_TYPE_LABEL,
  ORDER_DOCUMENT_TYPE_LABEL,
  type IncidentType,
} from '../../types/models';
import {
  ReportCardGrid,
  OrderRow,
  BriefingRow,
  useReportDelete,
  briefingTopicsLabel,
} from '../records';
import { RecordHistoryList } from './RecordHistoryList';
import { matchesQuery, projectNameMap } from './historyListUtils';
import {
  feedPaging,
  useHistoryBriefings,
  useHistoryIncidents,
  useHistoryOrders,
  useHistoryReports,
} from './useHistoryFeed';

/**
 * The four simple History tabs (Reports / Orders / Incidents / Briefings).
 * Each mounts one paged completed-only feed (useHistoryFeed) and applies the
 * screen-level search + project filter client-side over the loaded rows.
 * (The Inspections tab lives in InspectionHistoryTab.tsx — it additionally
 * carries swipe-to-delete and certificate counts.)
 */
export interface HistoryTabFilters {
  /** Free-text search over title / type / project name ('' = off). */
  search: string;
  /** Project chip filter (null = all projects). */
  projectId: string | null;
}

/** id → display-name map from the (login-warmed) projects cache. */
function useProjectNames(): Map<string, string> {
  const { data: projects = [] } = useProjects();
  return useMemo(() => projectNameMap(projects), [projects]);
}

export function ReportsTab({ search, projectId }: HistoryTabFilters) {
  const { t } = useTranslation();
  const router = useRouter();
  const confirmDelete = useReportDelete();
  const q = useHistoryReports();
  const projectNames = useProjectNames();
  const all = q.data ?? [];
  const items = useMemo(
    () =>
      all.filter(
        (r) =>
          (!projectId || r.project_id === projectId) &&
          matchesQuery(search, [r.title, projectNames.get(r.project_id)]),
      ),
    [all, search, projectId, projectNames],
  );
  return (
    <ReportCardGrid
      query={q}
      reports={items}
      totalCount={all.length}
      refreshQueries={[q]}
      paging={feedPaging(q)}
      emptyText={t('records.emptyReports')}
      onPressReport={(r) => router.push(`/reports/${r.id}` as never)}
      onDeleteReport={(r) => confirmDelete(r)}
    />
  );
}

export function OrdersTab({ search, projectId }: HistoryTabFilters) {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useHistoryOrders();
  const projectNames = useProjectNames();
  const all = q.data ?? [];
  const items = useMemo(
    () =>
      all.filter(
        (o) =>
          (!projectId || o.projectId === projectId) &&
          matchesQuery(search, [
            ORDER_DOCUMENT_TYPE_LABEL[o.documentType] ?? o.documentType,
            projectNames.get(o.projectId),
          ]),
      ),
    [all, search, projectId, projectNames],
  );
  return (
    <RecordHistoryList
      query={q}
      items={items}
      totalCount={all.length}
      keyOf={(o) => o.id}
      refreshQueries={[q]}
      paging={feedPaging(q)}
      emptyText={t('records.emptyOrders')}
      renderRow={(o, isLast) => (
        <OrderRow order={o} showBorder={!isLast} onPress={() => router.push(`/orders/${o.id}` as never)} />
      )}
    />
  );
}

export function IncidentsTab({ search, projectId }: HistoryTabFilters) {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useHistoryIncidents();
  const projectNames = useProjectNames();
  const all = q.data ?? [];
  const items = useMemo(
    () =>
      all.filter(
        (inc) =>
          (!projectId || inc.project_id === projectId) &&
          matchesQuery(search, [
            inc.location,
            inc.description,
            inc.injured_name,
            INCIDENT_TYPE_LABEL[inc.type as IncidentType] ?? inc.type,
            projectNames.get(inc.project_id),
          ]),
      ),
    [all, search, projectId, projectNames],
  );
  return (
    <RecordHistoryList
      query={q}
      items={items}
      totalCount={all.length}
      keyOf={(i) => i.id}
      refreshQueries={[q]}
      paging={feedPaging(q)}
      emptyText={t('records.emptyIncidents')}
      renderRow={(inc, isLast) => (
        <IncidentRow incident={inc} showBorder={!isLast} onPress={() => router.push(`/incidents/${inc.id}` as never)} />
      )}
    />
  );
}

export function BriefingsTab({ search, projectId }: HistoryTabFilters) {
  const { t } = useTranslation();
  const router = useRouter();
  const q = useHistoryBriefings();
  const projectNames = useProjectNames();
  const all = q.data ?? [];
  const items = useMemo(
    () =>
      all.filter(
        (b) =>
          (!projectId || b.projectId === projectId) &&
          matchesQuery(search, [
            briefingTopicsLabel(b.topics, t),
            b.inspectorName,
            projectNames.get(b.projectId),
          ]),
      ),
    [all, search, projectId, projectNames, t],
  );
  return (
    <RecordHistoryList
      query={q}
      items={items}
      totalCount={all.length}
      keyOf={(b) => b.id}
      refreshQueries={[q]}
      paging={feedPaging(q)}
      emptyText={t('records.emptyBriefings')}
      renderRow={(b, isLast) => (
        <BriefingRow briefing={b} showBorder={!isLast} onPress={() => router.push(`/briefings/${b.id}` as never)} />
      )}
    />
  );
}
