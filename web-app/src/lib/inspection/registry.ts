/**
 * Web-app inspection schema registry - maps a category tag (which equals both
 * `templates.category` and `inspections.type`) to its descriptor-driven PDF
 * schema. Web mirror of the schema half of the Expo app's
 * `lib/inspection/registry.ts` (the per-type create services live on web in
 * `lib/data/<type>.ts` and are dispatched via the structured-act registry,
 * `features/inspections/structured/acts`).
 *
 * Keyed by each schema's own `category`, so the dispatch key can never diverge
 * from the schema. New structured acts: add the schema import + a row here.
 */
import type { AnyInspectionSchema } from './schema';
import { bobcatSchema } from './schemas/bobcat';
import { safetyNetSchema } from './schemas/safetyNet';
import { excavatorSchema } from './schemas/excavator';
import { cargoPlatformSchema } from './schemas/cargoPlatform';
import { generalEquipmentSchema } from './schemas/generalEquipment';
import { mobileLadderSchema } from './schemas/mobileLadder';
import { forkliftSchema } from './schemas/forklift';
import { liftingAccessoriesSchema } from './schemas/liftingAccessories';
import { fallProtectionSchema } from './schemas/fallProtection';

const SCHEMAS: AnyInspectionSchema[] = [
  bobcatSchema,
  safetyNetSchema,
  excavatorSchema,
  cargoPlatformSchema,
  generalEquipmentSchema,
  mobileLadderSchema,
  forkliftSchema,
  liftingAccessoriesSchema,
  fallProtectionSchema,
];

export const INSPECTION_SCHEMAS: Record<string, AnyInspectionSchema> = Object.fromEntries(
  SCHEMAS.map((s) => [s.category, s]),
);

/** Look up a structured inspection schema by category, or null if unknown. */
export function getInspectionSchema(category: string | null | undefined): AnyInspectionSchema | null {
  if (!category) return null;
  return INSPECTION_SCHEMAS[category] ?? null;
}
