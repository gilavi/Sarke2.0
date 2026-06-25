/**
 * Unit tests for the Home cache-warming + record-list invalidation helpers in
 * `lib/apiHooks.ts`.
 *
 * These lock down the wiring behind the "Home shows projects but no record
 * widgets after first login" fix (see docs/reports/BUG_REPORT.md):
 *  - `warmHomeCaches` must force-refetch (staleTime: 0) EVERY Home query,
 *    including the five record-widget lists, using the SAME query keys the
 *    widgets read — otherwise the prefetch warms a different cache entry and
 *    the JWT-race empty `[]` still sticks.
 *  - `invalidateRecordLists` must be awaitable (Home's pull-to-refresh gates
 *    its spinner on it) and must cover every record namespace.
 *
 * apiHooks pulls the whole service graph at import time; each service module is
 * stubbed so the real apiHooks loads without a live Supabase client. The
 * helpers never invoke the queryFns (prefetchQuery/invalidateQueries are
 * spied), so empty stubs are sufficient.
 */
import { describe, it, expect, vi } from 'vitest';
import { RECENT_COMPLETED_LIMIT } from '../../features/records/recordTypes';

vi.mock('../../lib/services', () => ({
  projectsApi: {}, projectFilesApi: {}, templatesApi: {}, inspectionsApi: {},
  answersApi: {}, qualificationsApi: {}, certificatesApi: {}, projectItemsApi: {},
  schedulesApi: {}, incidentsApi: {}, reportsApi: {}, remoteSigningApi: {},
  paymentRecordsApi: {},
}));
vi.mock('../../lib/briefingsApi', () => ({ briefingsApi: {} }));
vi.mock('../../lib/ordersApi', () => ({ ordersApi: {} }));
vi.mock('../../lib/bobcatService', () => ({ bobcatApi: {} }));
vi.mock('../../lib/excavatorService', () => ({ excavatorApi: {} }));
vi.mock('../../lib/generalEquipmentService', () => ({ generalEquipmentApi: {} }));
vi.mock('../../lib/cargoPlatformService', () => ({ cargoPlatformApi: {} }));
vi.mock('../../lib/safetyNetService', () => ({ safetyNetApi: {} }));
vi.mock('../../lib/mobileLadderService', () => ({ mobileLadderApi: {} }));
vi.mock('../../lib/fallProtectionService', () => ({ fallProtectionApi: {} }));
vi.mock('../../lib/liftingAccessoriesService', () => ({ liftingAccessoriesApi: {} }));
vi.mock('../../lib/forkliftService', () => ({ forkliftApi: {} }));
vi.mock('../../lib/breathalyzerLogService', () => ({ breathalyzerLogApi: {} }));
vi.mock('../../lib/calendarSchedule', () => ({ getStore: () => ({}) }));
vi.mock('../../lib/calendarEvents', () => ({
  buildCalendarEvents: () => [],
  getOverdueCount: () => 0,
}));

import { warmHomeCaches, invalidateRecordLists, qk } from '../../lib/apiHooks';

const RECENT = { status: 'completed' as const, limit: RECENT_COMPLETED_LIMIT };

type PrefetchArg = { queryKey: readonly unknown[]; queryFn: () => Promise<unknown>; staleTime?: number };
type InvalidateArg = { queryKey: readonly unknown[] };

describe('warmHomeCaches', () => {
  it('prefetches every Home query with staleTime: 0', () => {
    const prefetchQuery = vi.fn((_opts: PrefetchArg) => Promise.resolve());
    warmHomeCaches({ prefetchQuery } as never);

    expect(prefetchQuery).toHaveBeenCalledTimes(9);
    for (const [arg] of prefetchQuery.mock.calls) {
      expect(arg.staleTime).toBe(0);
      expect(typeof arg.queryFn).toBe('function');
    }
  });

  it('warms the record-widget lists under the SAME keys the widgets read', () => {
    const prefetchQuery = vi.fn((_opts: PrefetchArg) => Promise.resolve());
    warmHomeCaches({ prefetchQuery } as never);

    const keys = prefetchQuery.mock.calls.map(([arg]) => arg.queryKey);

    // List-style Home queries.
    expect(keys).toContainEqual(qk.projects.list);
    expect(keys).toContainEqual(qk.qualifications.list);
    expect(keys).toContainEqual(qk.templates.list);

    // The five cross-project record-widget feeds — must match the opts used by
    // HomeRecordsSection / HistoryScreen ({ status: 'completed', limit: 50 }).
    expect(keys).toContainEqual(qk.inspections.recent(RECENT));
    expect(keys).toContainEqual(qk.reports.recent(RECENT));
    expect(keys).toContainEqual(qk.orders.recent(RECENT));
    expect(keys).toContainEqual(qk.incidents.recent(RECENT));
    expect(keys).toContainEqual(qk.briefings.recent(RECENT));

    // The Resume-draft card's most-recent-draft query ({ status: 'draft', limit: 1 }).
    expect(keys).toContainEqual(qk.inspections.recent({ status: 'draft', limit: 1 }));
  });

  it('swallows per-prefetch rejections so one failure cannot reject the rest', () => {
    const prefetchQuery = vi.fn((_opts: PrefetchArg) => Promise.reject(new Error('boom')));
    // Must not throw synchronously and must leave no unhandled rejection.
    expect(() => warmHomeCaches({ prefetchQuery } as never)).not.toThrow();
    expect(prefetchQuery).toHaveBeenCalledTimes(9);
  });
});

describe('invalidateRecordLists', () => {
  it('returns an awaitable that resolves once every namespace is invalidated', async () => {
    const invalidateQueries = vi.fn((_opts: InvalidateArg) => Promise.resolve());
    const ret = invalidateRecordLists({ invalidateQueries } as never);

    expect(ret).toBeInstanceOf(Promise);
    await expect(ret).resolves.toBeUndefined();
    expect(invalidateQueries).toHaveBeenCalledTimes(10);
  });

  it('covers every record namespace surfaced on Home', () => {
    const invalidateQueries = vi.fn((_opts: InvalidateArg) => Promise.resolve());
    invalidateRecordLists({ invalidateQueries } as never);

    const namespaces = invalidateQueries.mock.calls.map(([arg]) => arg.queryKey[0]);
    expect(namespaces).toEqual(
      expect.arrayContaining([
        'inspections', 'reports', 'orders', 'briefings', 'incidents', 'projects',
      ]),
    );
  });
});
