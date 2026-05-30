/**
 * General-equipment interactive descriptor for the unified structured wizard.
 *
 * Flexible/custom act (no fixed checklist, no verdict): specs → free-form
 * equipment list + conclusion (custom step). Catalogs/shapes come from
 * `@/lib/data/generalEquipment`, the same source the PDF schema uses.
 */
import {
  getGeneralEquipmentInspection,
  createGeneralEquipmentInspection,
  updateGeneralEquipmentInspection,
  deleteGeneralEquipmentInspection,
  type GeneralEquipmentInspection,
  type GeneralEquipmentPatch,
  type CreateGeneralEquipmentArgs,
} from '@/lib/data/generalEquipment';
import { generalEquipmentKeys } from '@/app/queryKeys';
import { equipmentInspectionName } from '@/lib/documentNames';
import type { WizardDescriptor } from '../types';
import { GeneralEquipmentList } from './GeneralEquipmentList';

export const generalEquipmentDescriptor: WizardDescriptor<
  GeneralEquipmentInspection,
  GeneralEquipmentPatch,
  CreateGeneralEquipmentArgs
> = {
  category: 'general_equipment',
  title: equipmentInspectionName('general'),
  itemLabel: 'ერთეული',

  get: getGeneralEquipmentInspection,
  create: createGeneralEquipmentInspection,
  update: updateGeneralEquipmentInspection,
  remove: deleteGeneralEquipmentInspection,
  detailKey: generalEquipmentKeys.detail,
  listKey: generalEquipmentKeys.lists,
  getProjectId: (m) => m.projectId,
  inspectorName: (m) => m.inspectorName,

  buildCreateArgs: ({ projectId, inspectorName, specValues }) => ({
    projectId,
    objectName: specValues.objectName || null,
    activityType: specValues.activityType || null,
    department: specValues.department || null,
    inspectorName: specValues.inspectorName || inspectorName || null,
    actNumber: specValues.actNumber || null,
  }),

  steps: [
    {
      kind: 'specs',
      key: 'info',
      title: 'ზოგადი ინფორმაცია',
      fields: [
        { key: 'objectName', label: 'ობიექტის დასახელება', value: (m) => m.objectName, patch: (v) => ({ objectName: v }) },
        { key: 'activityType', label: 'საქმიანობის ტიპი', value: (m) => m.activityType, patch: (v) => ({ activityType: v }) },
        { key: 'actNumber', label: 'აქტის ნომერი', value: (m) => m.actNumber, patch: (v) => ({ actNumber: v }) },
        { key: 'department', label: 'დეპარტამენტი', value: (m) => m.department, patch: (v) => ({ department: v }) },
        { key: 'inspectorName', label: 'ინსპექტორი', value: (m) => m.inspectorName, patch: (v) => ({ inspectorName: v }) },
      ],
    },
    {
      kind: 'custom',
      key: 'equipment',
      title: 'აღჭურვილობის სია',
      canAdvance: (m) => (m.equipment ?? []).some((r) => r.name.trim().length > 0),
      render: ({ model, disabled, save }) => <GeneralEquipmentList model={model} disabled={disabled} save={save} />,
    },
  ],

  completePatch: () => ({ status: 'completed' }),
  canComplete: (m) => (m.equipment ?? []).some((r) => r.name.trim().length > 0),
  summary: (m) => {
    const filled = (m.equipment ?? []).filter((r) => r.name.trim());
    const good = filled.filter((r) => r.condition === 'good').length;
    return { total: filled.length, good, problem: filled.length - good };
  },
};
