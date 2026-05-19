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
  | 'cargo_platform'
  | 'safety_net_inspection'
  | 'mobile_ladder_inspection'
  | 'fall_protection_inspection'
  | 'lifting_accessories_inspection'
  | 'forklift_inspection'
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
  if (source === 'cargo_platform') return `/inspections/cargo-platform/${id}`;
  if (source === 'safety_net_inspection') return `/inspections/safety-net/${id}`;
  if (source === 'mobile_ladder_inspection') return `/inspections/mobile-ladder/${id}`;
  if (source === 'fall_protection_inspection') return `/inspections/fall-protection/${id}`;
  if (source === 'lifting_accessories_inspection') return `/inspections/lifting-accessories/${id}`;
  if (source === 'forklift_inspection') return `/inspections/forklift/${id}`;
  return isCompleted ? `/inspections/${id}` : `/inspections/${id}/wizard`;
}
