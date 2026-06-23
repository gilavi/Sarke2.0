/**
 * Single source of truth for how each inspection act TYPE is presented in the
 * dashboard (label + illustration).
 *
 * Previously this was duplicated — and drifting — across two surfaces:
 *   - History.tsx          → PNG illustrations + one label set
 *   - ProjectActivityWidget → emoji + a DIFFERENT label set + different colors
 * which is why the same act looked different depending on where you saw it.
 * Add new types here only; every surface reads from this map.
 */

export type InspectionType =
  | 'harness'
  | 'xaracho'
  | 'mobile_scaffold'
  | 'mobile_scaffold_n3'
  | 'bobcat'
  | 'excavator'
  | 'general'
  | 'cargo_platform';

export interface InspectionTypeMeta {
  /** Georgian display label (the canonical one — no per-screen abbreviations). */
  label: string;
  /** Illustration path under /public/ilu. */
  image: string;
}

export const INSPECTION_TYPE_META: Record<InspectionType, InspectionTypeMeta> = {
  harness:            { label: 'დამცავი ქამარი',         image: 'ilu/harness.png' },
  xaracho:            { label: 'ფასადის ხარაჩო',          image: 'ilu/scaffolding.png' },
  mobile_scaffold:    { label: 'მობ. ხარაჩო',             image: 'ilu/mobile-staircase.png' },
  mobile_scaffold_n3: { label: 'მობ. ხარაჩო N3',          image: 'ilu/mobile-staircase.png' },
  bobcat:             { label: 'ციცხვიანი დამტვირთველი',   image: 'ilu/bulldozer-sm.png' },
  excavator:          { label: 'ექსკავატორი',             image: 'ilu/excavator.png' },
  general:            { label: 'ტექ. აღჭურვილობა',         image: 'ilu/clamp.png' },
  cargo_platform:     { label: 'ტვირთის პლატფორმა',        image: 'ilu/cargo.png' },
};

const FALLBACK: InspectionTypeMeta = { label: 'შემოწმება', image: 'ilu/clamp.png' };

/** Resolve type meta with a safe fallback for unknown/legacy template categories. */
export function inspectionTypeMeta(type: string | null | undefined): InspectionTypeMeta {
  if (type && type in INSPECTION_TYPE_META) return INSPECTION_TYPE_META[type as InspectionType];
  return FALLBACK;
}
