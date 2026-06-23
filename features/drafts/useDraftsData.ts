import {
  useRecentInspections,
  useRecentReports,
  useRecentOrders,
  useRecentIncidents,
  useRecentBriefings,
} from '../../lib/apiHooks';

const DRAFT_LIMIT = 200;

/**
 * Aggregates every type's drafts (cross-project) for the Drafts screen. Each
 * type's `recent({ status: 'draft' })` query is RLS-scoped to the signed-in
 * user. Returns per-type buckets, the union total, and a union three-state
 * loading flag.
 */
export function useDraftsData() {
  const inspectionsQ = useRecentInspections({ status: 'draft', limit: DRAFT_LIMIT });
  const reportsQ = useRecentReports({ status: 'draft', limit: DRAFT_LIMIT });
  const ordersQ = useRecentOrders({ status: 'draft', limit: DRAFT_LIMIT });
  const incidentsQ = useRecentIncidents({ status: 'draft', limit: DRAFT_LIMIT });
  const briefingsQ = useRecentBriefings({ status: 'draft', limit: DRAFT_LIMIT });

  const inspections = inspectionsQ.data ?? [];
  const reports = reportsQ.data ?? [];
  const orders = ordersQ.data ?? [];
  const incidents = incidentsQ.data ?? [];
  const briefings = briefingsQ.data ?? [];

  const total =
    inspections.length + reports.length + orders.length + incidents.length + briefings.length;
  const queries = [inspectionsQ, reportsQ, ordersQ, incidentsQ, briefingsQ];
  // Canonical three-state guard, unioned across the five queries.
  const loading = queries.some((q) => q.isFetching || !q.isFetched) && total === 0;

  return { inspections, reports, orders, incidents, briefings, total, loading, queries };
}
