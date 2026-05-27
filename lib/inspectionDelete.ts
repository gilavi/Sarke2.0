import { supabase } from './supabase';

/**
 * Delete an inspection row by its unified `source` / `category`. After the
 * 2026-05-27 identity unification, every inspection (generic + all 9
 * equipment types) has a parent row in public.inspections, and the
 * <type>_inspections.id → inspections.id FK is ON DELETE CASCADE. So
 * deleting from public.inspections cascades to clean up the equipment
 * row automatically — one call covers all 10 sources, no per-type table
 * lookup needed, and equipment-only deletes can no longer orphan the
 * parent (which would silently re-surface in the unified RPC list).
 *
 * @param _source  Intentionally unused — accepted for API uniformity so callers
 *   don't need to diverge, and to reserve the slot for future per-source
 *   pre-delete hooks (e.g. cleaning up storage objects).
 */
export async function deleteInspectionBySource(
  _source: string | undefined,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('inspections').delete().eq('id', id);
  if (error) throw error;
}
