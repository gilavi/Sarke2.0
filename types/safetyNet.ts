export const SAFETY_NET_TEMPLATE_ID = '88888888-8888-8888-8888-888888888888';

export type SNResult     = 'good' | 'fix' | 'na';
export type SNPostResult = 'pass' | 'fail';
export type SNVerdict    = 'pass' | 'fail';

export interface SNItemState {
  id: number;
  result: SNResult | null;
  comment: string | null;
  photo_paths: string[];
}

export interface SNPostTestState {
  id: number;
  result: SNPostResult | null;
}

export interface SNLoadTestRow {
  id: string;
  name: string;
  unitWeightKg: number | null;
  quantity: number | null;
  totalWeightKg: number | null;
  comment: string;
}

export interface SNSignatory {
  name: string;
  position: string;
  organization: string;
  /** Base64 PNG without the data: prefix. */
  signature: string | null;
  date: string | null;
}

export interface SafetyNetInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  // Section 1 — ზოგადი ინფორმაცია
  company: string;
  address: string;
  inspectorName: string;
  inspectionDate: string;
  // Section 2 — ბადის იდენტიფიკაცია
  manufacturer: string;
  netSize: string;
  postSize: string;
  postCount: number | null;
  postAnchorCount: number | null;
  anchorPointCount: number | null;
  edgeRopeCount: number | null;
  cellSide: string;
  workingDistance: string;
  certificate: 'none' | 'active' | 'expired' | null;
  // Sections 3–5
  items: SNItemState[];
  loadTestRows: SNLoadTestRow[];
  postTestItems: SNPostTestState[];
  // Section 6 — დასკვნა
  verdict: SNVerdict | null;
  verdictComment: string;
  // Sections 7–9
  signatures: SNSignatory[];
  qualDocPath: string | null;
  summaryPhotos: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Checklist catalog ─────────────────────────────────────────────────────────

export interface SNChecklistEntry {
  id: number;
  label: string;
  description: string;
}

export interface SNPostTestEntry {
  id: number;
  label: string;
}

export const SN_VISUAL_ITEMS: SNChecklistEntry[] = [
  { id: 1,  label: 'ბადის ქსოვილის მდგომარეობა',    description: 'ჭრა, გახეთქვა, წყვეტა' },
  { id: 2,  label: 'ბადის უჯრედი — მაქს. 15სმ',     description: '' },
  { id: 3,  label: 'ბადის კვანძების მდგრადობა',      description: 'გახსნა, კოროზია, დაზიანება' },
  { id: 4,  label: 'ბადი სამაგრი კიდეები',           description: 'კონსტრუქციისგან დაშორება' },
  { id: 5,  label: 'სამაგრი ბაგირების მდგომარეობა',  description: 'გახსნა, კოროზია, გაჭრა' },
  { id: 6,  label: 'კიდის ბაგირის მდგომარეობა',      description: 'გჭრილი, წყვეტილი' },
  { id: 7,  label: 'დგარების ვიზუალური მდგ.',        description: 'ბზარი, დაღუნული, კოროზია' },
  { id: 8,  label: 'დგარის სამაგრი ფეხი',            description: 'დაღუნული, ბზარი' },
  { id: 9,  label: 'სამაგრი ჭანჭიკები / ანკერები',  description: 'კოროზია, გაცვეთა, გახსნა' },
  { id: 10, label: 'დგარის სტაბილიზატორი',           description: 'მოშვებული, მოხსნილი, დაზიანება' },
];

export const SN_POST_TEST_ITEMS: SNPostTestEntry[] = [
  { id: 1, label: 'დგარის სამაგრი ფეხის მდგომარეობა' },
  { id: 2, label: 'დგარების მდგომარეობა' },
  { id: 3, label: 'სამაგრი ჭანჭიკის/ანკერის მდგ.' },
  { id: 4, label: 'ბადის ვიზუალური მდგომარეობა' },
  { id: 5, label: 'სამაგრი ბაგირების მდგომარეობა' },
];

export const SN_VERDICT_LABEL: Record<SNVerdict, string> = {
  pass: 'ტესტირება წარმატებულია',
  fail: 'ტესტირება წარუმატებელია',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildDefaultSNItems(): SNItemState[] {
  return SN_VISUAL_ITEMS.map(e => ({ id: e.id, result: null, comment: null, photo_paths: [] }));
}

export function buildDefaultSNPostTestItems(): SNPostTestState[] {
  return SN_POST_TEST_ITEMS.map(e => ({ id: e.id, result: null }));
}

export function buildDefaultSNLoadTestRow(): SNLoadTestRow {
  return {
    id: Math.random().toString(36).slice(2),
    name: '',
    unitWeightKg: null,
    quantity: null,
    totalWeightKg: null,
    comment: '',
  };
}

export function buildDefaultSNInspection(
  id: string,
  projectId: string,
  userId: string,
  templateId: string | null,
  now: string,
): SafetyNetInspection {
  const emptySignatory = (): SNSignatory => ({
    name: '', position: '', organization: '', signature: null, date: null,
  });
  return {
    id,
    projectId,
    templateId,
    userId,
    status: 'draft',
    company: '',
    address: '',
    inspectorName: '',
    inspectionDate: now.slice(0, 10),
    manufacturer: '',
    netSize: '',
    postSize: '',
    postCount: null,
    postAnchorCount: null,
    anchorPointCount: null,
    edgeRopeCount: null,
    cellSide: '',
    workingDistance: '',
    certificate: null,
    items: buildDefaultSNItems(),
    loadTestRows: [buildDefaultSNLoadTestRow(), buildDefaultSNLoadTestRow(), buildDefaultSNLoadTestRow()],
    postTestItems: buildDefaultSNPostTestItems(),
    verdict: null,
    verdictComment: '',
    signatures: [emptySignatory()],
    qualDocPath: null,
    summaryPhotos: [],
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function computeSNVerdictSuggestion(
  items: SNItemState[],
  postTestItems: SNPostTestState[],
): SNVerdict | null {
  const filled =
    items.filter(i => i.result !== null).length +
    postTestItems.filter(i => i.result !== null).length;
  if (filled === 0) return null;
  if (items.some(i => i.result === 'fix') || postTestItems.some(i => i.result === 'fail')) {
    return 'fail';
  }
  return 'pass';
}

export function snTotalWeight(rows: SNLoadTestRow[]): number {
  return rows.reduce((sum, r) => sum + (r.totalWeightKg ?? 0), 0);
}
