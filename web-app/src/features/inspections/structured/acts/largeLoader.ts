/**
 * Large-loader ("დიდი ციცხვიანი დამტვირთველი") interactive descriptor.
 *
 * The large-loader variant shares the `bobcat_inspections` table, the `bobcat`
 * category, and the bobcat data layer, but uses a different template UUID
 * (LARGE_LOADER_TEMPLATE_ID) and the 33-item LARGE_LOADER_ITEMS catalog. It is a
 * SEPARATE act in the registry (own route key `large_loader`) even though its
 * `descriptor.category` stays `'bobcat'` so it round-trips and reuses the bobcat
 * PDF schema (which already branches its catalog on `templateId`).
 */
import {
  LARGE_LOADER_ITEMS,
  BOBCAT_CATEGORY_LABELS,
  LARGE_LOADER_TEMPLATE_ID,
  type BobcatInspection,
} from '@/lib/types/bobcat';
import {
  getBobcatInspection,
  listBobcatInspections,
  createBobcatInspection,
  updateBobcatInspection,
  deleteBobcatInspection,
  type BobcatPatch,
  type CreateBobcatArgs,
} from '@/lib/data/bobcat';
import { bobcatKeys } from '@/app/queryKeys';
import type { WizardDescriptor, WizardResultOption, WizardItemState } from '../types';

const RESULT_OPTIONS: WizardResultOption[] = [
  { value: 'good', label: 'ნორმაში', tone: 'good' },
  { value: 'deficient', label: 'ხარვეზი', tone: 'warn' },
  { value: 'unusable', label: 'გამოუსად.', tone: 'bad' },
];

const VERDICT_OPTIONS: WizardResultOption[] = [
  { value: 'approved', label: '✓ დაშვებულია', tone: 'good' },
  { value: 'limited', label: 'პირობით', tone: 'warn' },
  { value: 'rejected', label: '✗ არ დაიშვება', tone: 'bad' },
];

const CHECKLIST_ITEMS = LARGE_LOADER_ITEMS.map((e) => ({
  id: e.id,
  label: e.label,
  description: e.description,
  group: BOBCAT_CATEGORY_LABELS[e.category],
  options: e.unusableLabel
    ? RESULT_OPTIONS.map((o) => (o.value === 'unusable' ? { ...o, label: e.unusableLabel as string } : o))
    : undefined,
}));

export const largeLoaderDescriptor: WizardDescriptor<BobcatInspection, BobcatPatch, CreateBobcatArgs> = {
  category: 'bobcat',
  title: 'დიდი ციცხვიანი დამტვირთველის შემოწმება',
  itemLabel: 'პუნქტი',

  get: getBobcatInspection,
  list: listBobcatInspections,
  create: createBobcatInspection,
  update: updateBobcatInspection,
  remove: deleteBobcatInspection,
  detailKey: bobcatKeys.detail,
  listKey: bobcatKeys.lists,
  getProjectId: (m) => m.projectId,
  inspectorName: (m) => m.inspectorName,

  buildCreateArgs: ({ projectId, inspectorName, specValues }) => ({
    projectId,
    templateId: LARGE_LOADER_TEMPLATE_ID,
    company: specValues.company || null,
    equipmentModel: specValues.equipmentModel || null,
    registrationNumber: specValues.registrationNumber || null,
    department: specValues.department || null,
    inspectorName: specValues.inspectorName || inspectorName || null,
  }),

  steps: [
    {
      kind: 'specs',
      key: 'info',
      title: 'ზოგადი ინფორმაცია',
      fields: [
        { key: 'company', label: 'კომპანია', value: (m) => m.company, patch: (v) => ({ company: v }) },
        { key: 'equipmentModel', label: 'მოდელი', value: (m) => m.equipmentModel, patch: (v) => ({ equipmentModel: v }) },
        { key: 'registrationNumber', label: 'სარეგ. ნომერი', value: (m) => m.registrationNumber, patch: (v) => ({ registrationNumber: v }) },
        { key: 'department', label: 'დეპარტამენტი', value: (m) => m.department, patch: (v) => ({ department: v }) },
        { key: 'inspectorName', label: 'ინსპექტორი', value: (m) => m.inspectorName, patch: (v) => ({ inspectorName: v }) },
      ],
    },
    {
      kind: 'checklist',
      key: 'checklist',
      title: 'შემოწმება',
      items: CHECKLIST_ITEMS,
      resultOptions: RESULT_OPTIONS,
      photoPrefix: 'bobcat',
      getStates: (m) => m.items as WizardItemState[],
      patch: (states) => ({ items: states as BobcatInspection['items'] }),
    },
    {
      kind: 'verdict',
      key: 'verdict',
      title: 'დასკვნა',
      options: VERDICT_OPTIONS,
      getVerdict: (m) => m.verdict,
      setVerdict: (v) => ({ verdict: v as BobcatInspection['verdict'] }),
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
