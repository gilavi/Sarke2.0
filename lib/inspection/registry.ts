/**
 * Single source of truth mapping `template.category` → its inspection service +
 * schema. Replaces two hand-maintained dispatch switches that had drifted out of
 * sync (app/projects/[id].tsx listed 9 types; app/template/[id]/start.tsx listed
 * only 3 and silently fell through to the generic questionnaire for the rest).
 *
 * Keyed by each schema's own `category`, so the dispatch key can never diverge
 * from the schema. `breathalyzerLog` is intentionally absent - it's a log, not a
 * checklist inspection. Unknown categories fall back to the generic questionnaire
 * at the call sites.
 */
import type { InspectionSchema } from './schema';

import { bobcatApi } from '../bobcatService';
import { excavatorApi } from '../excavatorService';
import { forkliftApi } from '../forkliftService';
import { generalEquipmentApi } from '../generalEquipmentService';
import { cargoPlatformApi } from '../cargoPlatformService';
import { safetyNetApi } from '../safetyNetService';
import { mobileLadderApi } from '../mobileLadderService';
import { fallProtectionApi } from '../fallProtectionService';
import { liftingAccessoriesApi } from '../liftingAccessoriesService';

import { bobcatSchema } from './schemas/bobcat';
import { excavatorSchema } from './schemas/excavator';
import { forkliftSchema } from './schemas/forklift';
import { generalEquipmentSchema } from './schemas/generalEquipment';
import { cargoPlatformSchema } from './schemas/cargoPlatform';
import { safetyNetSchema } from './schemas/safetyNet';
import { mobileLadderSchema } from './schemas/mobileLadder';
import { fallProtectionSchema } from './schemas/fallProtection';
import { liftingAccessoriesSchema } from './schemas/liftingAccessories';

export interface InspectionRegistryEntry {
  schema: InspectionSchema<any>;
  /** Create a new inspection record; returns at least its id. */
  create: (args: { projectId: string; templateId: string; inspectorName?: string }) => Promise<{ id: string }>;
  /** Reopen a completed inspection back to draft for editing (see lib/documents/reopen.ts). */
  reopen: (id: string) => Promise<void>;
}

const ENTRIES: InspectionRegistryEntry[] = [
  { schema: bobcatSchema, create: bobcatApi.create, reopen: bobcatApi.reopen },
  { schema: excavatorSchema, create: excavatorApi.create, reopen: excavatorApi.reopen },
  { schema: forkliftSchema, create: forkliftApi.create, reopen: forkliftApi.reopen },
  { schema: generalEquipmentSchema, create: generalEquipmentApi.create, reopen: generalEquipmentApi.reopen },
  { schema: cargoPlatformSchema, create: cargoPlatformApi.create, reopen: cargoPlatformApi.reopen },
  { schema: safetyNetSchema, create: safetyNetApi.create, reopen: safetyNetApi.reopen },
  { schema: mobileLadderSchema, create: mobileLadderApi.create, reopen: mobileLadderApi.reopen },
  { schema: fallProtectionSchema, create: fallProtectionApi.create, reopen: fallProtectionApi.reopen },
  { schema: liftingAccessoriesSchema, create: liftingAccessoriesApi.create, reopen: liftingAccessoriesApi.reopen },
];

export const inspectionRegistry: Record<string, InspectionRegistryEntry> = Object.fromEntries(
  ENTRIES.map((e) => [e.schema.category, e]),
);
