/**
 * Structured-act registry - the single dispatch table tying each act's
 * interactive descriptor (this folder) to its PDF schema
 * (`@/lib/inspection/registry`) and its routes (`@/app/routes`).
 *
 * Keyed by a unique **act key** (the route segment), NOT by category, because
 * two acts can share a category: bobcat + large-loader both live in
 * `bobcat_inspections` with category `'bobcat'` (distinguished by `templateId`).
 * The PDF schema is still looked up by `descriptor.category` (the bobcat schema
 * branches its catalog on templateId).
 *
 * Adding a structured act: add its descriptor + schema + routes, then register a
 * row here. The wizard, the print route, and the new-inspection picker all read
 * from this map, so a new act lights up everywhere at once.
 */
import { getInspectionSchema } from '@/lib/inspection/registry';
import type { AnyInspectionSchema } from '@/lib/inspection/schema';
import { routes } from '@/app/routes';
import { bobcatDescriptor } from './bobcat';
import { largeLoaderDescriptor } from './largeLoader';
import { safetyNetDescriptor } from './safetyNet';
import { excavatorDescriptor } from './excavator';
import { cargoPlatformDescriptor } from './cargoPlatform';
import { generalEquipmentDescriptor } from './generalEquipment';
import { mobileLadderDescriptor } from './mobileLadder';
import { forkliftDescriptor } from './forklift';
import { liftingAccessoriesDescriptor } from './liftingAccessories';
import { fallProtectionDescriptor } from './fallProtection';
import type { AnyWizardDescriptor } from '../types';

export interface StructuredAct {
  /** Unique act key = route segment (e.g. 'bobcat', 'large_loader'). */
  key: string;
  /** DB/PDF category (`templates.category` = `inspections.type`); may repeat across acts. */
  category: string;
  descriptor: AnyWizardDescriptor;
  schema: AnyInspectionSchema;
  /** Picker / menu label. */
  menuLabel: string;
  detail: (id: string) => string;
  print: (id: string) => string;
  newRoute: string;
  /**
   * When true, the act is NOT queried as its own row source on the inspections
   * list (its rows are surfaced by a sibling act that shares the table - e.g.
   * large-loader rows are rendered by the bobcat query, split by templateId).
   */
  excludeFromList?: boolean;
}

function act(
  key: string,
  descriptor: AnyWizardDescriptor,
  menuLabel: string,
  r: { detail: (id: string) => string; print: (id: string) => string; new: string },
  opts?: { excludeFromList?: boolean },
): StructuredAct {
  const schema = getInspectionSchema(descriptor.category);
  if (!schema) throw new Error(`No PDF schema registered for category ${descriptor.category}`);
  return {
    key,
    category: descriptor.category,
    descriptor,
    schema,
    menuLabel,
    detail: r.detail,
    print: r.print,
    newRoute: r.new,
    excludeFromList: opts?.excludeFromList,
  };
}

const ACTS: StructuredAct[] = [
  act('bobcat', bobcatDescriptor, 'ციცხვიანი დამტვირთველის შემოწმების აქტი', {
    detail: routes.bobcat.detail,
    print: routes.bobcat.print,
    new: routes.bobcat.new,
  }),
  act('large_loader', largeLoaderDescriptor, 'დიდი ციცხვიანი დამტვირთველის შემოწმება', {
    detail: routes.largeLoader.detail,
    print: routes.largeLoader.print,
    new: routes.largeLoader.new,
  }, { excludeFromList: true }),
  act('safety_net_inspection', safetyNetDescriptor, 'უსაფრთხოების ბადის შემოწმების აქტი', {
    detail: routes.safetyNet.detail,
    print: routes.safetyNet.print,
    new: routes.safetyNet.new,
  }),
  act('excavator', excavatorDescriptor, 'ექსკავატორის ტექნიკური შემოწმების აქტი', {
    detail: routes.excavator.detail,
    print: routes.excavator.print,
    new: routes.excavator.new,
  }),
  act('general_equipment', generalEquipmentDescriptor, 'ტექნიკური აღჭურვილობის შემოწმების აქტი', {
    detail: routes.generalEquipment.detail,
    print: routes.generalEquipment.print,
    new: routes.generalEquipment.new,
  }),
  act('cargo_platform', cargoPlatformDescriptor, 'ტვირთის მიმღები პლატფორმის შემოწმების აქტი', {
    detail: routes.cargoPlatform.detail,
    print: routes.cargoPlatform.print,
    new: routes.cargoPlatform.new,
  }),
  act('mobile_ladder_inspection', mobileLadderDescriptor, 'მობილური კიბის შემოწმების აქტი', {
    detail: routes.mobileLadder.detail,
    print: routes.mobileLadder.print,
    new: routes.mobileLadder.new,
  }),
  act('forklift_inspection', forkliftDescriptor, 'ჩანგლიანი დამტვირთველის შემოწმების აქტი', {
    detail: routes.forklift.detail,
    print: routes.forklift.print,
    new: routes.forklift.new,
  }),
  act('lifting_accessories_inspection', liftingAccessoriesDescriptor, 'ტვირთის გადასატანი თასმების / ჩამჭიდების შემოწმების აქტი', {
    detail: routes.liftingAccessories.detail,
    print: routes.liftingAccessories.print,
    new: routes.liftingAccessories.new,
  }),
  act('fall_protection_inspection', fallProtectionDescriptor, 'დამჭერი მოწყობილობების შემოწმების აქტი', {
    detail: routes.fallProtection.detail,
    print: routes.fallProtection.print,
    new: routes.fallProtection.new,
  }),
];

export const STRUCTURED_ACTS: Record<string, StructuredAct> = Object.fromEntries(
  ACTS.map((a) => [a.key, a]),
);

/** Ordered list for menus / pickers. */
export const STRUCTURED_ACT_LIST = ACTS;

/** Look up an act by its route key (e.g. 'bobcat', 'large_loader'). */
export function getStructuredAct(key: string | null | undefined): StructuredAct | null {
  if (!key) return null;
  return STRUCTURED_ACTS[key] ?? null;
}

/**
 * Look up a structured act by its DB category (= `templates.category`). Used by
 * the create wizard to dispatch a picked equipment template to its own
 * structured flow. Excludes list-shadowed acts (e.g. large_loader shares
 * bobcat's category + table; the bobcat act is the canonical create entry).
 */
export function getStructuredActByCategory(category: string | null | undefined): StructuredAct | null {
  if (!category) return null;
  return ACTS.find((a) => a.category === category && !a.excludeFromList) ?? null;
}

/** A structured-act row flattened for the inspections list (data-driven). */
export interface StructuredRow {
  id: string;
  label: string;
  /** Act key (drives the row emoji + delete dispatch). */
  actKey: string;
  projectId: string;
  status: string;
  date: string;
  href: string;
}

/** Map one act's rows to the flat list shape used by the Inspections page. */
export function actRows(act: StructuredAct, items: Array<{ id: string; status: string; createdAt?: string }>): StructuredRow[] {
  return items.map((i) => ({
    id: i.id,
    label: act.menuLabel,
    actKey: act.key,
    projectId: (act.descriptor.getProjectId(i as never) ?? '') as string,
    status: i.status,
    date: act.descriptor.getCreatedAt ? act.descriptor.getCreatedAt(i as never) : (i.createdAt ?? ''),
    href: act.detail(i.id),
  }));
}
