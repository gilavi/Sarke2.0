/**
 * reopenDocument — un-complete a finished document so the EXISTING create/wizard/
 * edit flow can edit it, after which the normal completion path re-completes it
 * (regenerating the PDF and re-capturing the in-memory signature).
 *
 * This is an orchestrator over existing services, not a new persistence
 * primitive: it only ever writes `status -> 'draft'` (+ `completed_at -> null`
 * where the schema has it). It never touches audit fields, so the relaxed freeze
 * trigger (migration 20260623150000_allow_inspection_reopen.sql) admits the
 * generic-inspection case; every other family is unfrozen and reopens with a
 * plain `update`.
 *
 * The two inspection regimes store "completed" in different tables, so the
 * dispatch must flip the table the detail screen actually reads:
 *   - genericInspection   → parent `public.inspections` row (frozen; relaxed).
 *   - equipmentInspection → `<type>_inspections` row via the per-type service,
 *                            which also mirrors status onto the shared parent
 *                            `public.inspections` row so the unified feeds stay
 *                            in sync (see lib/inspection/service.ts `syncParent`).
 * See docs/primitives.md and the plan in the document-edit feature.
 */
import type { QueryClient } from '@tanstack/react-query';

import { inspectionsApi, incidentsApi, reportsApi } from '../services';
import { ordersApi } from '../ordersApi';
import { briefingsApi } from '../briefingsApi';
import { inspectionRegistry } from '../inspection/registry';
import { invalidateRecordLists } from '../apiHooks';
import type { InspectionSource } from '../inspectionRouting';

/** Discriminated union of every reopenable document family. */
export type ReopenTarget =
  | { kind: 'genericInspection'; id: string }
  | { kind: 'equipmentInspection'; id: string; source: InspectionSource }
  | { kind: 'report'; id: string }
  | { kind: 'order'; id: string }
  | { kind: 'incident'; id: string }
  | { kind: 'briefing'; id: string };

/**
 * Reopen a completed document back to draft and refresh the record lists.
 *
 * Side effects: one Supabase UPDATE on the relevant table, then
 * `invalidateRecordLists(qc)` so Home / History / project-detail re-fetch.
 * Throws if the underlying service write fails (e.g. RLS, offline, or — for a
 * generic inspection — the freeze trigger rejecting a malformed reopen).
 */
export async function reopenDocument(target: ReopenTarget, qc: QueryClient): Promise<void> {
  switch (target.kind) {
    case 'genericInspection':
      // Parent inspections row. The relaxed freeze trigger only admits this
      // exact shape (status draft + completed_at null), so keep it minimal.
      await inspectionsApi.update({ id: target.id, status: 'draft', completed_at: null });
      break;

    case 'equipmentInspection': {
      // Equipment "completed" lives on the <type>_inspections table; reopen it
      // there via the per-type service resolved from the registry by category.
      // The service also mirrors the reopen onto the shared parent inspections
      // row, so the unified feeds reflect it.
      const entry = inspectionRegistry[String(target.source)];
      if (!entry) throw new Error(`reopenDocument: unknown equipment source "${target.source}"`);
      await entry.reopen(target.id);
      break;
    }

    case 'report':
      await reportsApi.update(target.id, { status: 'draft' });
      break;

    case 'order':
      await ordersApi.update(target.id, { status: 'draft' });
      break;

    case 'incident':
      await incidentsApi.update(target.id, { status: 'draft' });
      break;

    case 'briefing':
      await briefingsApi.update(target.id, { status: 'draft' });
      break;
  }

  invalidateRecordLists(qc);
}
