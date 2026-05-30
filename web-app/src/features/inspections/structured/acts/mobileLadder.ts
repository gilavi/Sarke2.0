/**
 * Mobile-ladder interactive descriptor for the unified structured wizard.
 * specs (general + ladder id) → A/B checklist (safe/damaged/na) → verdict
 * (safe/minor/banned). Catalogs/vocab from `@/lib/types/mobileLadder`.
 */
import {
  ML_CHECKLIST_ITEMS,
  ML_SECTION_LABELS,
  ML_RESULT_TO_CHIP,
  ML_VERDICT_LABELS,
  MOBILE_LADDER_TEMPLATE_ID,
  type MobileLadderInspection,
  type MLItemState,
} from '@/lib/types/mobileLadder';
import {
  getMobileLadderInspection,
  listMobileLadderInspections,
  createMobileLadderInspection,
  updateMobileLadderInspection,
  deleteMobileLadderInspection,
  type MobileLadderPatch,
  type CreateMobileLadderArgs,
} from '@/lib/data/mobileLadder';
import { mobileLadderKeys } from '@/app/queryKeys';
import type { WizardDescriptor, WizardResultOption, WizardItemState, WizardChecklistItem } from '../types';

const RESULT_OPTIONS: WizardResultOption[] = [
  { value: 'safe', label: ML_RESULT_TO_CHIP.safe, tone: 'good' },
  { value: 'damaged', label: ML_RESULT_TO_CHIP.damaged, tone: 'bad' },
  { value: 'na', label: ML_RESULT_TO_CHIP.na, tone: 'neutral' },
];

const VERDICT_OPTIONS: WizardResultOption[] = [
  { value: 'safe', label: ML_VERDICT_LABELS.safe, tone: 'good' },
  { value: 'minor', label: ML_VERDICT_LABELS.minor, tone: 'warn' },
  { value: 'banned', label: ML_VERDICT_LABELS.banned, tone: 'bad' },
];

const CHECKLIST_ITEMS: WizardChecklistItem[] = ML_CHECKLIST_ITEMS.map((e) => ({
  id: e.id,
  label: e.label,
  description: e.description || undefined,
  group: ML_SECTION_LABELS[e.section],
}));

export const mobileLadderDescriptor: WizardDescriptor<MobileLadderInspection, MobileLadderPatch, CreateMobileLadderArgs> = {
  category: 'mobile_ladder_inspection',
  title: 'მობილური კიბის შემოწმების აქტი',
  itemLabel: 'პუნქტი',

  get: getMobileLadderInspection,
  list: listMobileLadderInspections,
  create: createMobileLadderInspection,
  update: updateMobileLadderInspection,
  remove: deleteMobileLadderInspection,
  detailKey: mobileLadderKeys.detail,
  listKey: mobileLadderKeys.lists,
  getProjectId: (m) => m.projectId,
  inspectorName: (m) => m.inspectorName,

  buildCreateArgs: ({ projectId, inspectorName, specValues }) => ({
    projectId,
    templateId: MOBILE_LADDER_TEMPLATE_ID,
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
        { key: 'ladderType', label: 'სახეობა', value: (m) => m.ladderType, patch: (v) => ({ ladderType: v }) },
        { key: 'model', label: 'მწარმოებელი / მოდელი', value: (m) => m.model, patch: (v) => ({ model: v }) },
      ],
    },
    {
      kind: 'checklist',
      key: 'checklist',
      title: 'შემოწმება',
      items: CHECKLIST_ITEMS,
      resultOptions: RESULT_OPTIONS,
      photoPrefix: 'mobile-ladder',
      getStates: (m) => m.items as WizardItemState[],
      patch: (s) => ({ items: s as MLItemState[] }),
    },
    {
      kind: 'verdict',
      key: 'verdict',
      title: 'დასკვნა',
      options: VERDICT_OPTIONS,
      getVerdict: (m) => m.verdict,
      setVerdict: (v) => ({ verdict: v as MobileLadderInspection['verdict'] }),
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
