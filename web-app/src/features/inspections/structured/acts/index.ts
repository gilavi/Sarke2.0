/**
 * Structured-act registry — the single dispatch table tying each act's
 * interactive descriptor (this folder) to its PDF schema
 * (`@/lib/inspection/registry`) and its routes (`@/app/routes`). Mirrors the
 * Expo app's `lib/inspection/registry.ts` so the web flow dispatches on the same
 * category tag (= `templates.category` = `inspections.type`).
 *
 * Adding a structured act: add its descriptor + schema + routes, then register a
 * row here. The wizard, the print route, and the new-inspection picker all read
 * from this map, so a new act lights up everywhere at once.
 */
import { getInspectionSchema } from '@/lib/inspection/registry';
import type { AnyInspectionSchema } from '@/lib/inspection/schema';
import { routes } from '@/app/routes';
import { bobcatDescriptor } from './bobcat';
import { safetyNetDescriptor } from './safetyNet';
import { excavatorDescriptor } from './excavator';
import { cargoPlatformDescriptor } from './cargoPlatform';
import { generalEquipmentDescriptor } from './generalEquipment';
import type { AnyWizardDescriptor } from '../types';

export interface StructuredAct {
  category: string;
  descriptor: AnyWizardDescriptor;
  schema: AnyInspectionSchema;
  /** Picker / menu label. */
  menuLabel: string;
  detail: (id: string) => string;
  print: (id: string) => string;
  newRoute: string;
}

function act(
  descriptor: AnyWizardDescriptor,
  menuLabel: string,
  r: { detail: (id: string) => string; print: (id: string) => string; new: string },
): StructuredAct {
  const schema = getInspectionSchema(descriptor.category);
  if (!schema) throw new Error(`No PDF schema registered for category ${descriptor.category}`);
  return { category: descriptor.category, descriptor, schema, menuLabel, detail: r.detail, print: r.print, newRoute: r.new };
}

const ACTS: StructuredAct[] = [
  act(bobcatDescriptor, 'ციცხვიანი დამტვირთველის შემოწმების აქტი', {
    detail: routes.bobcat.detail,
    print: routes.bobcat.print,
    new: routes.bobcat.new,
  }),
  act(safetyNetDescriptor, 'უსაფრთხოების ბადის შემოწმების აქტი', {
    detail: routes.safetyNet.detail,
    print: routes.safetyNet.print,
    new: routes.safetyNet.new,
  }),
  act(excavatorDescriptor, 'ექსკავატორის ტექნიკური შემოწმების აქტი', {
    detail: routes.excavator.detail,
    print: routes.excavator.print,
    new: routes.excavator.new,
  }),
  act(generalEquipmentDescriptor, 'ტექნიკური აღჭურვილობის შემოწმების აქტი', {
    detail: routes.generalEquipment.detail,
    print: routes.generalEquipment.print,
    new: routes.generalEquipment.new,
  }),
  act(cargoPlatformDescriptor, 'ტვირთის მიმღები პლატფორმის შემოწმების აქტი', {
    detail: routes.cargoPlatform.detail,
    print: routes.cargoPlatform.print,
    new: routes.cargoPlatform.new,
  }),
];

export const STRUCTURED_ACTS: Record<string, StructuredAct> = Object.fromEntries(
  ACTS.map((a) => [a.category, a]),
);

/** Ordered list for menus / pickers. */
export const STRUCTURED_ACT_LIST = ACTS;

export function getStructuredAct(category: string | null | undefined): StructuredAct | null {
  if (!category) return null;
  return STRUCTURED_ACTS[category] ?? null;
}
