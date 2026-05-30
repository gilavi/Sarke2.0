/**
 * Lifting-accessories interactive descriptor for the unified structured wizard.
 * specs (general + identification) → A/B checklist (ok/fail) → verdict
 * (pass/repair/fail). Catalogs/vocab from `@/lib/types/liftingAccessories`.
 */
import {
  LA_CHECKLIST_ITEMS,
  LA_SECTION_LABELS,
  LA_RESULT_TO_CHIP,
  LA_VERDICT_LABELS,
  LIFTING_ACCESSORIES_TEMPLATE_ID,
  type LiftingAccessoriesInspection,
  type LAItemState,
} from '@/lib/types/liftingAccessories';
import {
  getLiftingAccessoriesInspection,
  listLiftingAccessoriesInspections,
  createLiftingAccessoriesInspection,
  updateLiftingAccessoriesInspection,
  deleteLiftingAccessoriesInspection,
  type LiftingAccessoriesPatch,
  type CreateLiftingAccessoriesArgs,
} from '@/lib/data/liftingAccessories';
import { liftingAccessoriesKeys } from '@/app/queryKeys';
import type { WizardDescriptor, WizardResultOption, WizardItemState, WizardChecklistItem } from '../types';

const RESULT_OPTIONS: WizardResultOption[] = [
  { value: 'ok', label: LA_RESULT_TO_CHIP.ok, tone: 'good' },
  { value: 'fail', label: LA_RESULT_TO_CHIP.fail, tone: 'bad' },
];

const VERDICT_OPTIONS: WizardResultOption[] = [
  { value: 'pass', label: LA_VERDICT_LABELS.pass, tone: 'good' },
  { value: 'repair', label: LA_VERDICT_LABELS.repair, tone: 'warn' },
  { value: 'fail', label: LA_VERDICT_LABELS.fail, tone: 'bad' },
];

const CHECKLIST_ITEMS: WizardChecklistItem[] = LA_CHECKLIST_ITEMS.map((e) => ({
  id: e.id,
  label: e.label,
  description: e.description || undefined,
  group: LA_SECTION_LABELS[e.section],
}));

export const liftingAccessoriesDescriptor: WizardDescriptor<
  LiftingAccessoriesInspection,
  LiftingAccessoriesPatch,
  CreateLiftingAccessoriesArgs
> = {
  category: 'lifting_accessories_inspection',
  title: 'ტვირთის გადასატანი თასმების / ჩამჭიდების შემოწმების აქტი',
  itemLabel: 'პუნქტი',

  get: getLiftingAccessoriesInspection,
  list: listLiftingAccessoriesInspections,
  create: createLiftingAccessoriesInspection,
  update: updateLiftingAccessoriesInspection,
  remove: deleteLiftingAccessoriesInspection,
  detailKey: liftingAccessoriesKeys.detail,
  listKey: liftingAccessoriesKeys.lists,
  getProjectId: (m) => m.projectId,
  inspectorName: (m) => m.inspectorName,

  buildCreateArgs: ({ projectId, inspectorName, specValues }) => ({
    projectId,
    templateId: LIFTING_ACCESSORIES_TEMPLATE_ID,
    company: specValues.company || null,
    address: specValues.address || null,
    inspectorName: specValues.inspectorName || inspectorName || null,
  }),

  steps: [
    {
      kind: 'specs',
      key: 'info',
      title: 'ზოგადი ინფორმაცია',
      fields: [
        { key: 'company', label: 'კომპანია', value: (m) => m.company, patch: (v) => ({ company: v }) },
        { key: 'address', label: 'მისამართი', value: (m) => m.address, patch: (v) => ({ address: v }) },
        { key: 'inspectorName', label: 'ინსპექტორი', value: (m) => m.inspectorName, patch: (v) => ({ inspectorName: v }) },
        { key: 'serialNumber', label: 'სერ. NN / ID', value: (m) => m.serialNumber, patch: (v) => ({ serialNumber: v }) },
        { key: 'manufacturer', label: 'მწარმოებელი', value: (m) => m.manufacturer, patch: (v) => ({ manufacturer: v }) },
        { key: 'wllKg', label: 'WLL (კგ)', value: (m) => m.wllKg, patch: (v) => ({ wllKg: v }) },
      ],
    },
    {
      kind: 'checklist',
      key: 'checklist',
      title: 'შემოწმება',
      items: CHECKLIST_ITEMS,
      resultOptions: RESULT_OPTIONS,
      photoPrefix: 'lifting-accessories',
      getStates: (m) => m.items as WizardItemState[],
      patch: (s) => ({ items: s as LAItemState[] }),
    },
    {
      kind: 'verdict',
      key: 'verdict',
      title: 'დასკვნა',
      options: VERDICT_OPTIONS,
      getVerdict: (m) => m.verdict,
      setVerdict: (v) => ({ verdict: v as LiftingAccessoriesInspection['verdict'] }),
      getNotes: (m) => m.verdictComment,
      setNotes: (v) => ({ verdictComment: v }),
      notesLabel: 'კომენტარი',
    },
  ],

  completePatch: () => ({ status: 'completed' }),
  canComplete: (m) => !!m.verdict,
  summary: (m) => {
    const evaluated = (m.items ?? []).filter((i) => i.result !== null);
    const good = evaluated.filter((i) => i.result === 'ok').length;
    return { total: evaluated.length, good, problem: evaluated.length - good };
  },
};
