/**
 * Excavator interactive descriptor for the unified structured wizard.
 *
 * Re-expresses the excavator act (previously the bespoke ExcavatorDetail page)
 * on the shared engine: specs → 4 category checklists (engine / undercarriage /
 * cabin / safety) → maintenance (custom yes/no/date) → verdict. Catalogs + vocab
 * come from `@/lib/types/excavator`, the same source the PDF schema uses.
 */
import {
  ENGINE_ITEMS,
  UNDERCARRIAGE_ITEMS,
  CABIN_ITEMS,
  SAFETY_ITEMS,
  EXCAVATOR_VERDICT_LABEL,
  type ExcavatorInspection,
  type ExcavatorChecklistItemState,
} from '@/lib/types/excavator';
import {
  getExcavatorInspection,
  createExcavatorInspection,
  updateExcavatorInspection,
  deleteExcavatorInspection,
  type ExcavatorPatch,
  type CreateExcavatorArgs,
} from '@/lib/data/excavator';
import { excavatorKeys } from '@/app/queryKeys';
import { equipmentInspectionName } from '@/lib/documentNames';
import type { WizardDescriptor, WizardResultOption, WizardItemState, WizardChecklistItem } from '../types';
import { ExcavatorMaintenance } from './ExcavatorMaintenance';

const RESULT_OPTIONS: WizardResultOption[] = [
  { value: 'good', label: 'კარგია', tone: 'good' },
  { value: 'deficient', label: 'ნაკლი', tone: 'warn' },
  { value: 'unusable', label: 'გამოუს.', tone: 'bad' },
];

const VERDICT_OPTIONS: WizardResultOption[] = [
  { value: 'approved', label: EXCAVATOR_VERDICT_LABEL.approved, tone: 'good' },
  { value: 'conditional', label: EXCAVATOR_VERDICT_LABEL.conditional, tone: 'warn' },
  { value: 'rejected', label: EXCAVATOR_VERDICT_LABEL.rejected, tone: 'bad' },
];

const toItems = (catalog: { id: number; label: string; description: string }[]): WizardChecklistItem[] =>
  catalog.map((e) => ({ id: e.id, label: e.label, description: e.description }));

const allStates = (m: ExcavatorInspection): ExcavatorChecklistItemState[] => [
  ...m.engineItems,
  ...m.undercarriageItems,
  ...m.cabinItems,
  ...m.safetyItems,
];

export const excavatorDescriptor: WizardDescriptor<ExcavatorInspection, ExcavatorPatch, CreateExcavatorArgs> = {
  category: 'excavator',
  title: equipmentInspectionName('excavator'),
  itemLabel: 'პუნქტი',

  get: getExcavatorInspection,
  create: createExcavatorInspection,
  update: updateExcavatorInspection,
  remove: deleteExcavatorInspection,
  detailKey: excavatorKeys.detail,
  listKey: excavatorKeys.lists,
  getProjectId: (m) => m.projectId,
  inspectorName: (m) => m.inspectorName,

  buildCreateArgs: ({ projectId, inspectorName, specValues }) => ({
    projectId,
    serialNumber: specValues.serialNumber || null,
    inventoryNumber: specValues.inventoryNumber || null,
    projectName: specValues.projectName || null,
    department: specValues.department || null,
    inspectorName: specValues.inspectorName || inspectorName || null,
  }),

  steps: [
    {
      kind: 'specs',
      key: 'info',
      title: 'ზოგადი ინფორმაცია',
      fields: [
        { key: 'serialNumber', label: 'სერ. ნომერი', value: (m) => m.serialNumber, patch: (v) => ({ serialNumber: v }) },
        { key: 'inventoryNumber', label: 'ინვ. ნომერი', value: (m) => m.inventoryNumber, patch: (v) => ({ inventoryNumber: v }) },
        { key: 'projectName', label: 'ობიექტი / პროექტი', value: (m) => m.projectName, patch: (v) => ({ projectName: v }) },
        { key: 'department', label: 'დეპარტამენტი', value: (m) => m.department, patch: (v) => ({ department: v }) },
        { key: 'inspectorName', label: 'ინსპექტორი', value: (m) => m.inspectorName, patch: (v) => ({ inspectorName: v }) },
      ],
    },
    {
      kind: 'checklist', key: 'engine', title: 'ძრავა / ჰიდრავლიკა',
      items: toItems(ENGINE_ITEMS), resultOptions: RESULT_OPTIONS, photoPrefix: 'excavator',
      getStates: (m) => m.engineItems as WizardItemState[],
      patch: (s) => ({ engineItems: s as ExcavatorChecklistItemState[] }),
    },
    {
      kind: 'checklist', key: 'undercarriage', title: 'სავალი ნაწილი',
      items: toItems(UNDERCARRIAGE_ITEMS), resultOptions: RESULT_OPTIONS, photoPrefix: 'excavator',
      getStates: (m) => m.undercarriageItems as WizardItemState[],
      patch: (s) => ({ undercarriageItems: s as ExcavatorChecklistItemState[] }),
    },
    {
      kind: 'checklist', key: 'cabin', title: 'კაბინა',
      items: toItems(CABIN_ITEMS), resultOptions: RESULT_OPTIONS, photoPrefix: 'excavator',
      getStates: (m) => m.cabinItems as WizardItemState[],
      patch: (s) => ({ cabinItems: s as ExcavatorChecklistItemState[] }),
    },
    {
      kind: 'checklist', key: 'safety', title: 'უსაფრთხოება',
      items: toItems(SAFETY_ITEMS), resultOptions: RESULT_OPTIONS, photoPrefix: 'excavator',
      getStates: (m) => m.safetyItems as WizardItemState[],
      patch: (s) => ({ safetyItems: s as ExcavatorChecklistItemState[] }),
    },
    {
      kind: 'custom',
      key: 'maintenance',
      title: 'ტექნიკური მომსახურება',
      render: ({ model, disabled, save }) => <ExcavatorMaintenance model={model} disabled={disabled} save={save} />,
    },
    {
      kind: 'verdict', key: 'verdict', title: 'დასკვნა',
      options: VERDICT_OPTIONS,
      getVerdict: (m) => m.verdict,
      setVerdict: (v) => ({ verdict: v as ExcavatorInspection['verdict'] }),
      getNotes: (m) => m.notes,
      setNotes: (v) => ({ notes: v }),
      notesLabel: 'შენიშვნები / ხარვეზები',
    },
  ],

  completePatch: () => ({ status: 'completed' }),
  canComplete: (m) => !!m.verdict,
  summary: (m) => {
    const evaluated = allStates(m).filter((i) => i.result !== null);
    const good = evaluated.filter((i) => i.result === 'good').length;
    return { total: evaluated.length, good, problem: evaluated.length - good };
  },
};
