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
  | 'general_equipment'
  | 'cargo_platform'
  | 'large_loader'
  | 'safety_net_inspection'
  | 'mobile_ladder_inspection'
  | 'forklift_inspection'
  | 'lifting_accessories_inspection'
  | 'fall_protection_inspection';

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
  // Alias: the structured act registry keys this type 'general_equipment'.
  general_equipment:  { label: 'ტექ. აღჭურვილობა',         image: 'ilu/clamp.png' },
  cargo_platform:     { label: 'ტვირთის პლატფორმა',        image: 'ilu/cargo.png' },
  // Structured acts restored on the redesign branch (keys = act registry keys).
  large_loader:                   { label: 'დიდი დამტვირთველი',      image: 'ilu/bulldozer.png' },
  safety_net_inspection:          { label: 'უსაფრთხოების ბადე',      image: 'ilu/safety-net.png' },
  mobile_ladder_inspection:       { label: 'მობილური კიბე',          image: 'ilu/mobile-staircase.png' },
  forklift_inspection:            { label: 'ჩანგლიანი დამტვირთველი', image: 'ilu/forklift.png' },
  lifting_accessories_inspection: { label: 'ტვირთის თასმები',        image: 'ilu/crane.png' },
  fall_protection_inspection:     { label: 'დამჭერი მოწყობილობები',  image: 'ilu/ppe-set.png' },
};

const FALLBACK: InspectionTypeMeta = { label: 'შემოწმება', image: 'ilu/clamp.png' };

/** Resolve type meta with a safe fallback for unknown/legacy template categories. */
export function inspectionTypeMeta(type: string | null | undefined): InspectionTypeMeta {
  if (type && type in INSPECTION_TYPE_META) return INSPECTION_TYPE_META[type as InspectionType];
  return FALLBACK;
}
