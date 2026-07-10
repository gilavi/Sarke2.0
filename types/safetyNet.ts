import i18n from '../lib/i18n';

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
  // Section 1 - ზოგადი ინფორმაცია
  company: string;
  address: string;
  inspectorName: string;
  inspectionDate: string;
  // Section 2 - ბადის იდენტიფიკაცია
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
  // Section 6 - დასკვნა
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
  labelKey: string;
  descriptionKey?: string;
}

export interface SNPostTestEntry {
  id: number;
  labelKey: string;
}

/** Resolve a catalog entry's label/description at call time (render or PDF-generation), never at module load — the CMS overlay may not have arrived yet at import time. */
export const snItemLabel = (entry: { labelKey: string }): string => i18n.t(entry.labelKey);
export const snItemDescription = (entry: { descriptionKey?: string }): string =>
  entry.descriptionKey ? i18n.t(entry.descriptionKey) : '';

export const SN_VISUAL_ITEMS: SNChecklistEntry[] = [
  { id: 1,  labelKey: 'inspections.snVisualItem1Label',  descriptionKey: 'inspections.snVisualItem1Desc' },
  { id: 2,  labelKey: 'inspections.snVisualItem2Label' },
  { id: 3,  labelKey: 'inspections.snVisualItem3Label',  descriptionKey: 'inspections.snVisualItem3Desc' },
  { id: 4,  labelKey: 'inspections.snVisualItem4Label',  descriptionKey: 'inspections.snVisualItem4Desc' },
  { id: 5,  labelKey: 'inspections.snVisualItem5Label',  descriptionKey: 'inspections.snVisualItem5Desc' },
  { id: 6,  labelKey: 'inspections.snVisualItem6Label',  descriptionKey: 'inspections.snVisualItem6Desc' },
  { id: 7,  labelKey: 'inspections.snVisualItem7Label',  descriptionKey: 'inspections.snVisualItem7Desc' },
  { id: 8,  labelKey: 'inspections.snVisualItem8Label',  descriptionKey: 'inspections.snVisualItem8Desc' },
  { id: 9,  labelKey: 'inspections.snVisualItem9Label',  descriptionKey: 'inspections.snVisualItem9Desc' },
  { id: 10, labelKey: 'inspections.snVisualItem10Label', descriptionKey: 'inspections.snVisualItem10Desc' },
];

export const SN_POST_TEST_ITEMS: SNPostTestEntry[] = [
  { id: 1, labelKey: 'inspections.snPostItem1Label' },
  { id: 2, labelKey: 'inspections.snPostItem2Label' },
  { id: 3, labelKey: 'inspections.snPostItem3Label' },
  { id: 4, labelKey: 'inspections.snPostItem4Label' },
  { id: 5, labelKey: 'inspections.snPostItem5Label' },
];

/** Resolve at call time (never at module load) — see snItemLabel. */
export function snVerdictLabel(v: SNVerdict): string {
  return i18n.t(v === 'pass' ? 'inspections.snVerdictPass' : 'inspections.snVerdictFail');
}

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
