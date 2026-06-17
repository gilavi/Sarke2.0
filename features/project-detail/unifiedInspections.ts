// Cross-source inspection helpers for the project detail screen.
//
// The unified per-project list now comes pre-merged from the
// get_project_inspections_unified() RPC (see lib/apiHooks
// useUnifiedInspectionsByProject). The `source` field IS the value of
// public.inspections.type - same value set that `routeForInspection` already
// understands ('bobcat', 'excavator', …, plus the generic categories like
// 'harness' / 'xaracho' / 'mobile_scaffold' / 'mobile_scaffold_n3').
//
// Swipe-delete dispatches to deleteInspectionBySource (which routes the DB
// delete to the correct equipment table or to inspections proper), then
// optimistically removes the row from the unified query cache via the
// supplied removal callback. No more 10 per-source setters.

import type { UnifiedInspectionPreview } from '../../lib/apiHooks';
import { deleteInspectionBySource } from '../../lib/inspectionDelete';

export type UnifiedInspection = UnifiedInspectionPreview;

/**
 * Performs the delete against the source-specific API, then optimistically
 * removes the row from the unified cache via the supplied callback.
 * Throws on API error so the caller can show a toast and avoid mutating
 * local state if the delete failed.
 */
export async function deleteUnifiedInspection(
  item: UnifiedInspection,
  removeFromCache: (id: string) => void,
): Promise<void> {
  await deleteInspectionBySource(item.source, item.id);
  removeFromCache(item.id);
}
