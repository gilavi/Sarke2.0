/**
 * Canonical helper for resolving inspection routes.
 *
 * Both `template.category` (when creating) and `item.source` (when viewing
 * a unified inspection from the project screen) use the same value set, so a
 * single function covers both call sites.
 */

export type InspectionSource =
  | 'bobcat'
  | 'excavator'
  | 'general_equipment'
  | string   // generic / fallback
  | null
  | undefined;

/**
 * Returns the expo-router `href` string for an inspection.
 *
 * @param source    template.category OR UnifiedInspection.source
 * @param id        inspection record id
 * @param isCompleted  true for completed inspections (generic only — equipment
 *                     types always use their own detail screen)
 */
export function routeForInspection(
  source: InspectionSource,
  id: string,
  isCompleted: boolean,
): string {
  if (source === 'bobcat') return `/inspections/bobcat/${id}`;
  if (source === 'excavator') return `/inspections/excavator/${id}`;
  if (source === 'general_equipment') return `/inspections/general-equipment/${id}`;
  return isCompleted ? `/inspections/${id}` : `/inspections/${id}/wizard`;
}
