/**
 * Fall-protection interactive descriptor for the unified structured wizard
 * (flattened single-device). specs (general + device) → checklist
 * (safe/critical/minor/na) → verdict (safe/minor/banned).
 * Catalogs/vocab from `@/lib/types/fallProtection`.
 */
import {
  FP_CHECKLIST_ITEMS,
  FP_RESULT_TO_CHIP,
  FP_VERDICT_LABELS,
  FALL_PROTECTION_TEMPLATE_ID,
  type FallProtectionInspection,
  type FPItemState,
} from '@/lib/types/fallProtection';
import {
  getFallProtectionInspection,
  listFallProtectionInspections,
  createFallProtectionInspection,
  updateFallProtectionInspection,
  deleteFallProtectionInspection,
  type FallProtectionPatch,
  type CreateFallProtectionArgs,
} from '@/lib/data/fallProtection';
import { fallProtectionKeys } from '@/app/queryKeys';
import type { WizardDescriptor, WizardResultOption, WizardItemState, WizardChecklistItem } from '../types';

const RESULT_OPTIONS: WizardResultOption[] = [
  { value: 'safe', label: FP_RESULT_TO_CHIP.safe, tone: 'good' },
  { value: 'minor', label: FP_RESULT_TO_CHIP.minor, tone: 'warn' },
  { value: 'critical', label: FP_RESULT_TO_CHIP.critical, tone: 'bad' },
  { value: 'na', label: FP_RESULT_TO_CHIP.na, tone: 'neutral' },
];

const VERDICT_OPTIONS: WizardResultOption[] = [
  { value: 'safe', label: FP_VERDICT_LABELS.safe, tone: 'good' },
  { value: 'minor', label: FP_VERDICT_LABELS.minor, tone: 'warn' },
  { value: 'banned', label: FP_VERDICT_LABELS.banned, tone: 'bad' },
];

const CHECKLIST_ITEMS: WizardChecklistItem[] = FP_CHECKLIST_ITEMS.map((e) => ({ id: e.id, label: e.label }));

export const fallProtectionDescriptor: WizardDescriptor<
  FallProtectionInspection,
  FallProtectionPatch,
  CreateFallProtectionArgs
> = {
  category: 'fall_protection_inspection',
  title: 'დამჭერი მოწყობილობების შემოწმების აქტი',
  itemLabel: 'პუნქტი',

  get: getFallProtectionInspection,
  list: listFallProtectionInspections,
  create: createFallProtectionInspection,
  update: updateFallProtectionInspection,
  remove: deleteFallProtectionInspection,
  detailKey: fallProtectionKeys.detail,
  listKey: fallProtectionKeys.lists,
  getProjectId: (m) => m.projectId,
  inspectorName: (m) => m.safetyLeaderName,

  buildCreateArgs: ({ projectId, specValues }) => ({
    projectId,
    templateId: FALL_PROTECTION_TEMPLATE_ID,
    company: specValues.company || null,
    address: specValues.address || null,
    safetyLeaderName: specValues.safetyLeaderName || null,
  }),

  steps: [
    {
      kind: 'specs',
      key: 'info',
      title: 'ზოგადი ინფორმაცია',
      fields: [
        { key: 'company', label: 'ობიექტის დასახელება', value: (m) => m.company, patch: (v) => ({ company: v }) },
        { key: 'address', label: 'მისამართი', value: (m) => m.address, patch: (v) => ({ address: v }) },
        { key: 'safetyLeaderName', label: 'უსაფრთხ. ხელმძღვ.', value: (m) => m.safetyLeaderName, patch: (v) => ({ safetyLeaderName: v }) },
        { key: 'safetyLeaderPhone', label: 'ტელეფონი', value: (m) => m.safetyLeaderPhone, patch: (v) => ({ safetyLeaderPhone: v }) },
        { key: 'deviceType', label: 'მოწყობილობის ტიპი', value: (m) => m.deviceType, patch: (v) => ({ deviceType: v }) },
        { key: 'deviceLocation', label: 'განთავსების ადგილი', value: (m) => m.deviceLocation, patch: (v) => ({ deviceLocation: v }) },
      ],
    },
    {
      kind: 'checklist',
      key: 'checklist',
      title: 'შემოწმება',
      items: CHECKLIST_ITEMS,
      resultOptions: RESULT_OPTIONS,
      photoPrefix: 'fall-protection',
      getStates: (m) => m.items as WizardItemState[],
      patch: (s) => ({ items: s as FPItemState[] }),
    },
    {
      kind: 'verdict',
      key: 'verdict',
      title: 'დასკვნა',
      options: VERDICT_OPTIONS,
      getVerdict: (m) => m.verdict,
      setVerdict: (v) => ({ verdict: v as FallProtectionInspection['verdict'] }),
      getNotes: (m) => m.verdictComment,
      setNotes: (v) => ({ verdictComment: v }),
      notesLabel: 'კომენტარი',
    },
  ],

  completePatch: () => ({ status: 'completed' }),
  canComplete: (m) => !!m.verdict,
  summary: (m) => {
    const evaluated = (m.items ?? []).filter((i) => i.result !== null);
    const good = evaluated.filter((i) => i.result === 'safe').length;
    return { total: evaluated.length, good, problem: evaluated.length - good };
  },
};
