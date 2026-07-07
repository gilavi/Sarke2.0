/**
 * Safety-net interactive descriptor for the unified structured wizard.
 *
 * Built new on the shared engine. Step rhythm:
 *   specs (general + net identification) → visual checklist (good/fix/na) →
 *   load-test weight table (custom) → post-test matrix (pass/fail) → verdict.
 * Catalogs + vocab come from `@/lib/types/safetyNet`, the same source the PDF
 * schema uses, so screen and PDF stay in sync.
 *
 * Regulatory: signatures are never persisted - captured on the completed verdict
 * step via SignatureCapture and rasterized into the PDF only.
 */
import {
  SN_VISUAL_ITEMS,
  SN_POST_TEST_ITEMS,
  SAFETY_NET_TEMPLATE_ID,
  type SafetyNetInspection,
} from '@/lib/types/safetyNet';
import {
  getSafetyNetInspection,
  listSafetyNetInspections,
  createSafetyNetInspection,
  updateSafetyNetInspection,
  deleteSafetyNetInspection,
  type SafetyNetPatch,
  type CreateSafetyNetArgs,
} from '@/lib/data/safetyNet';
import { safetyNetKeys } from '@/app/queryKeys';
import type { WizardDescriptor, WizardResultOption, WizardItemState } from '../types';
import { SafetyNetLoadTest } from './SafetyNetLoadTest';

const VISUAL_OPTIONS: WizardResultOption[] = [
  { value: 'good', label: 'კარგი', tone: 'good' },
  { value: 'fix', label: 'გამოსასწ.', tone: 'warn' },
  { value: 'na', label: 'N/A', tone: 'neutral' },
];

const POST_OPTIONS: WizardResultOption[] = [
  { value: 'pass', label: 'გამოც. ✓', tone: 'good' },
  { value: 'fail', label: 'პრობლ. ✗', tone: 'bad' },
];

const VERDICT_OPTIONS: WizardResultOption[] = [
  { value: 'pass', label: '✓ წარმატებული', tone: 'good' },
  { value: 'fail', label: '✗ წარუმატებელი', tone: 'bad' },
];

export const safetyNetDescriptor: WizardDescriptor<SafetyNetInspection, SafetyNetPatch, CreateSafetyNetArgs> = {
  category: 'safety_net_inspection',
  title: 'უსაფრთხოების ბადის შემოწმების აქტი',
  itemLabel: 'პუნქტი',

  get: getSafetyNetInspection,
  list: listSafetyNetInspections,
  create: createSafetyNetInspection,
  update: updateSafetyNetInspection,
  remove: deleteSafetyNetInspection,
  detailKey: safetyNetKeys.detail,
  listKey: safetyNetKeys.lists,
  getProjectId: (m) => m.projectId,
  inspectorName: (m) => m.inspectorName,

  buildCreateArgs: ({ projectId, inspectorName, specValues }) => ({
    projectId,
    templateId: SAFETY_NET_TEMPLATE_ID,
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
        { key: 'manufacturer', label: 'დასახელება', value: (m) => m.manufacturer, patch: (v) => ({ manufacturer: v }) },
        { key: 'netSize', label: 'ბადის ზომა (მ×მ)', value: (m) => m.netSize, patch: (v) => ({ netSize: v }) },
        { key: 'postSize', label: 'დგარის ზომა', value: (m) => m.postSize, patch: (v) => ({ postSize: v }) },
        { key: 'cellSide', label: 'უჯრედის მხარე', value: (m) => m.cellSide, patch: (v) => ({ cellSide: v }) },
        { key: 'workingDistance', label: 'ბადის დგარებს შორის მანძილი', value: (m) => m.workingDistance, patch: (v) => ({ workingDistance: v }) },
      ],
    },
    {
      kind: 'checklist',
      key: 'visual',
      title: 'ვიზუალური შემოწმება',
      items: SN_VISUAL_ITEMS.map((e) => ({ id: e.id, label: e.label, description: e.description || undefined })),
      resultOptions: VISUAL_OPTIONS,
      photoPrefix: 'safety-net',
      getStates: (m) => m.items as WizardItemState[],
      patch: (states) => ({ items: states as SafetyNetInspection['items'] }),
    },
    {
      kind: 'custom',
      key: 'loadTest',
      title: 'დატვირთვის ტესტი',
      render: ({ model, disabled, save }) => (
        <SafetyNetLoadTest model={model} disabled={disabled} save={save} />
      ),
    },
    {
      kind: 'checklist',
      key: 'postTest',
      title: 'ტვირთის ჩაგდების შემდეგ',
      items: SN_POST_TEST_ITEMS.map((e) => ({ id: e.id, label: e.label })),
      resultOptions: POST_OPTIONS,
      withDetails: false,
      getStates: (m) => m.postTestItems as WizardItemState[],
      patch: (states) => ({ postTestItems: states as SafetyNetInspection['postTestItems'] }),
    },
    {
      kind: 'verdict',
      key: 'verdict',
      title: 'დასკვნა',
      options: VERDICT_OPTIONS,
      getVerdict: (m) => m.verdict,
      setVerdict: (v) => ({ verdict: v as SafetyNetInspection['verdict'] }),
      getNotes: (m) => m.verdictComment,
      setNotes: (v) => ({ verdictComment: v }),
      notesLabel: 'კომენტარი',
    },
  ],

  completePatch: () => ({ status: 'completed' }),
  canComplete: (m) => !!m.verdict,
  summary: (m) => {
    const visual = (m.items ?? []).filter((i) => i.result !== null);
    const post = (m.postTestItems ?? []).filter((i) => i.result !== null);
    const good =
      visual.filter((i) => i.result === 'good').length + post.filter((i) => i.result === 'pass').length;
    const total = visual.length + post.length;
    return { total, good, problem: total - good };
  },
};
