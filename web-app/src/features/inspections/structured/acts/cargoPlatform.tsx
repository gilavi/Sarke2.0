/**
 * Cargo-platform interactive descriptor for the unified structured wizard.
 *
 * Re-expresses the cargo-platform act on the shared engine: specs → A/B checklist
 * (good/fix/na) → cargo weight table (custom) → verdict. Catalogs + vocab come
 * from `@/lib/data/cargoPlatform`, the same source the PDF schema uses.
 */
import {
  CP_ITEMS,
  CP_SECTION_LABELS,
  CP_RESULT_LABEL,
  CP_VERDICT_LABEL,
  getCargoPlatformInspection,
  createCargoPlatformInspection,
  updateCargoPlatformInspection,
  deleteCargoPlatformInspection,
  type CargoPlatformInspection,
  type CargoPlatformPatch,
  type CreateCargoPlatformArgs,
  type CPItemState,
} from '@/lib/data/cargoPlatform';
import { cargoPlatformKeys } from '@/app/queryKeys';
import { equipmentInspectionName } from '@/lib/documentNames';
import type { WizardDescriptor, WizardResultOption, WizardItemState, WizardChecklistItem } from '../types';
import { CargoWeightTable } from './CargoWeightTable';

const RESULT_OPTIONS: WizardResultOption[] = [
  { value: 'good', label: CP_RESULT_LABEL.good, tone: 'good' },
  { value: 'fix', label: CP_RESULT_LABEL.fix, tone: 'warn' },
  { value: 'na', label: CP_RESULT_LABEL.na, tone: 'neutral' },
];

const VERDICT_OPTIONS: WizardResultOption[] = [
  { value: 'approved', label: CP_VERDICT_LABEL.approved, tone: 'good' },
  { value: 'conditional', label: CP_VERDICT_LABEL.conditional, tone: 'warn' },
  { value: 'rejected', label: CP_VERDICT_LABEL.rejected, tone: 'bad' },
];

const CHECKLIST_ITEMS: WizardChecklistItem[] = CP_ITEMS.map((e) => ({
  id: e.id,
  label: e.label,
  description: e.description,
  group: CP_SECTION_LABELS[e.section],
}));

export const cargoPlatformDescriptor: WizardDescriptor<CargoPlatformInspection, CargoPlatformPatch, CreateCargoPlatformArgs> = {
  category: 'cargo_platform',
  title: equipmentInspectionName('cargo_platform'),
  itemLabel: 'პუნქტი',

  get: getCargoPlatformInspection,
  create: createCargoPlatformInspection,
  update: updateCargoPlatformInspection,
  remove: deleteCargoPlatformInspection,
  detailKey: cargoPlatformKeys.detail,
  listKey: cargoPlatformKeys.lists,
  getProjectId: (m) => m.projectId,
  inspectorName: (m) => m.inspectorName,

  buildCreateArgs: ({ projectId }) => ({ projectId }),

  steps: [
    {
      kind: 'specs',
      key: 'info',
      title: 'ზოგადი ინფორმაცია',
      fields: [
        { key: 'company', label: 'კომპანია', value: (m) => m.company, patch: (v) => ({ company: v }) },
        { key: 'address', label: 'მისამართი', value: (m) => m.address, patch: (v) => ({ address: v }) },
        { key: 'inspectorName', label: 'ინსპექტორი', value: (m) => m.inspectorName, patch: (v) => ({ inspectorName: v }) },
        { key: 'floorZone', label: 'სართული / ზონა', value: (m) => m.floorZone, patch: (v) => ({ floorZone: v }) },
        { key: 'platformTypeModel', label: 'პლატფ. ტიპი / მოდელი', value: (m) => m.platformTypeModel, patch: (v) => ({ platformTypeModel: v }) },
      ],
    },
    {
      kind: 'checklist',
      key: 'checklist',
      title: 'ვიზუალური შემოწმება',
      items: CHECKLIST_ITEMS,
      resultOptions: RESULT_OPTIONS,
      photoPrefix: 'cargo-platform',
      getStates: (m) => m.items as WizardItemState[],
      patch: (s) => ({ items: s as CPItemState[] }),
    },
    {
      kind: 'custom',
      key: 'cargo',
      title: 'ტვირთის იდენტიფიკაცია',
      render: ({ model, disabled, save }) => <CargoWeightTable model={model} disabled={disabled} save={save} />,
    },
    {
      kind: 'verdict',
      key: 'verdict',
      title: 'დასკვნა',
      options: VERDICT_OPTIONS,
      getVerdict: (m) => m.verdict,
      setVerdict: (v) => ({ verdict: v as CargoPlatformInspection['verdict'] }),
      getNotes: (m) => m.verdictComment,
      setNotes: (v) => ({ verdictComment: v }),
      notesLabel: 'კომენტარი',
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
