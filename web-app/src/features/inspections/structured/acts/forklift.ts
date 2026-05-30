/**
 * Forklift interactive descriptor for the unified structured wizard.
 * specs → category-grouped checklist (good/deficient/unusable) → verdict.
 * Catalogs/vocab from `@/lib/types/forklift`.
 */
import {
  FORKLIFT_ITEMS,
  FORKLIFT_CATEGORY_LABELS,
  FORKLIFT_VERDICT_LABEL,
  FORKLIFT_TEMPLATE_ID,
  type ForkliftInspection,
  type ForkliftItemState,
} from '@/lib/types/forklift';
import {
  getForkliftInspection,
  listForkliftInspections,
  createForkliftInspection,
  updateForkliftInspection,
  deleteForkliftInspection,
  type ForkliftPatch,
  type CreateForkliftArgs,
} from '@/lib/data/forklift';
import { forkliftKeys } from '@/app/queryKeys';
import type { WizardDescriptor, WizardResultOption, WizardItemState, WizardChecklistItem } from '../types';

const RESULT_OPTIONS: WizardResultOption[] = [
  { value: 'good', label: 'კარგია', tone: 'good' },
  { value: 'deficient', label: 'ნაკლი', tone: 'warn' },
  { value: 'unusable', label: 'გამოუს.', tone: 'bad' },
];

const VERDICT_OPTIONS: WizardResultOption[] = [
  { value: 'approved', label: FORKLIFT_VERDICT_LABEL.approved, tone: 'good' },
  { value: 'limited', label: FORKLIFT_VERDICT_LABEL.limited, tone: 'warn' },
  { value: 'rejected', label: FORKLIFT_VERDICT_LABEL.rejected, tone: 'bad' },
];

const CHECKLIST_ITEMS: WizardChecklistItem[] = FORKLIFT_ITEMS.map((e) => ({
  id: e.id,
  label: e.label,
  description: e.description,
  group: FORKLIFT_CATEGORY_LABELS[e.category],
}));

export const forkliftDescriptor: WizardDescriptor<ForkliftInspection, ForkliftPatch, CreateForkliftArgs> = {
  category: 'forklift_inspection',
  title: 'ჩანგლიანი დამტვირთველის შემოწმების აქტი',
  itemLabel: 'პუნქტი',

  get: getForkliftInspection,
  list: listForkliftInspections,
  create: createForkliftInspection,
  update: updateForkliftInspection,
  remove: deleteForkliftInspection,
  detailKey: forkliftKeys.detail,
  listKey: forkliftKeys.lists,
  getProjectId: (m) => m.projectId,
  inspectorName: (m) => m.inspectorName,

  buildCreateArgs: ({ projectId, inspectorName, specValues }) => ({
    projectId,
    templateId: FORKLIFT_TEMPLATE_ID,
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
        { key: 'brandModel', label: 'მარკა / მოდელი', value: (m) => m.brandModel, patch: (v) => ({ brandModel: v }) },
        { key: 'inventoryNumber', label: 'ინვ. / სერ. ნომერი', value: (m) => m.inventoryNumber, patch: (v) => ({ inventoryNumber: v }) },
        { key: 'inspectorName', label: 'ინსპექტორი', value: (m) => m.inspectorName, patch: (v) => ({ inspectorName: v }) },
      ],
    },
    {
      kind: 'checklist',
      key: 'checklist',
      title: 'შემოწმება',
      items: CHECKLIST_ITEMS,
      resultOptions: RESULT_OPTIONS,
      photoPrefix: 'forklift',
      getStates: (m) => m.items as WizardItemState[],
      patch: (s) => ({ items: s as ForkliftItemState[] }),
    },
    {
      kind: 'verdict',
      key: 'verdict',
      title: 'დასკვნა',
      options: VERDICT_OPTIONS,
      getVerdict: (m) => m.verdict,
      setVerdict: (v) => ({ verdict: v as ForkliftInspection['verdict'] }),
      getNotes: (m) => m.notes,
      setNotes: (v) => ({ notes: v }),
      notesLabel: 'შენიშვნები / ხარვეზები',
    },
  ],

  completePatch: () => ({ status: 'completed' }),
  canComplete: (m) => !!m.verdict,
  summary: (m) => {
    const evaluated = (m.items ?? []).filter((i) => i.result !== null);
    const good = evaluated.filter((i) => i.result === 'good').length;
    return { total: evaluated.length, good, problem: evaluated.length - good };
  },
};
