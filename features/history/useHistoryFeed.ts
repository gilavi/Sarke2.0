// Paged (infinite) variants of the five completed-record feeds, used only by
// the History tabs. Each feed:
//
//   - keys as `[...qk.<type>.recent(completed/50), 'paged']` — the `'paged'`
//     suffix keeps it a SIBLING of the plain Home-widget key while still
//     starting with the same namespace, so `invalidateRecordLists` (which
//     invalidates by `['inspections']`-style prefixes) refreshes both;
//   - seeds page 1 from the plain `recent` cache entry (warmed at login by
//     `warmHomeCaches` and kept fresh by the Home widgets), so opening History
//     stays an instant cache hit exactly like before pagination;
//   - pages by offset via `RecentRecordsOpts.offset` (PostgREST `.range()`),
//     `HISTORY_PAGE_SIZE` rows at a time, until a short page signals the end.
//
// `select` flattens pages, so `.data` is a plain `T[]` like the old hooks.
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { qk } from '../../lib/apiHooks';
import { inspectionsApi, incidentsApi, reportsApi } from '../../lib/services';
import { ordersApi } from '../../lib/ordersApi';
import { briefingsApi } from '../../lib/briefingsApi';
import { RECENT_COMPLETED_LIMIT } from '../records';
import { nextPageOffset } from './historyListUtils';
import type {
  Briefing,
  Incident,
  Inspection,
  Order,
  RecentRecordsOpts,
  Report,
} from '../../types/models';

/** Page size — matches the Home-widget feed cap so page 1 IS the warmed list. */
export const HISTORY_PAGE_SIZE = RECENT_COMPLETED_LIMIT;

const COMPLETED_PAGE: RecentRecordsOpts = { status: 'completed', limit: HISTORY_PAGE_SIZE };

function useRecentFeed<T>(
  baseKey: readonly unknown[],
  fetchPage: (opts: RecentRecordsOpts) => Promise<T[]>,
) {
  const qc = useQueryClient();
  return useInfiniteQuery({
    queryKey: [...baseKey, 'paged'],
    queryFn: ({ pageParam }): Promise<T[]> =>
      fetchPage({ ...COMPLETED_PAGE, offset: pageParam || undefined }),
    initialPageParam: 0,
    getNextPageParam: (_lastPage: T[], allPages: T[][]) =>
      nextPageOffset(allPages, HISTORY_PAGE_SIZE),
    select: (data: InfiniteData<T[], number>) => data.pages.flat(),
    // Adopt the Home-warmed plain list as page 1 (with its true fetch time, so
    // staleTime still schedules a background refresh when it's actually old).
    initialData: (): InfiniteData<T[], number> | undefined => {
      const cached = qc.getQueryData<T[]>(baseKey);
      return cached ? { pages: [cached], pageParams: [0] } : undefined;
    },
    initialDataUpdatedAt: () => qc.getQueryState(baseKey)?.dataUpdatedAt,
  });
}

export function useHistoryInspections() {
  return useRecentFeed<Inspection>(qk.inspections.recent(COMPLETED_PAGE), (o) =>
    inspectionsApi.recent(o),
  );
}

export function useHistoryReports() {
  return useRecentFeed<Report>(qk.reports.recent(COMPLETED_PAGE), (o) => reportsApi.recent(o));
}

export function useHistoryOrders() {
  return useRecentFeed<Order>(qk.orders.recent(COMPLETED_PAGE), (o) => ordersApi.recent(o));
}

export function useHistoryIncidents() {
  return useRecentFeed<Incident>(qk.incidents.recent(COMPLETED_PAGE), (o) =>
    incidentsApi.recent(o),
  );
}

export function useHistoryBriefings() {
  return useRecentFeed<Briefing>(qk.briefings.recent(COMPLETED_PAGE), (o) =>
    briefingsApi.recent(o),
  );
}

/** The pagination surface each tab forwards to its list scaffold. */
export type HistoryFeedPaging = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

/** Extract the list-scaffold paging props from a feed result. */
export function feedPaging(q: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}): HistoryFeedPaging {
  return {
    hasNextPage: q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    onLoadMore: () => void q.fetchNextPage(),
  };
}
