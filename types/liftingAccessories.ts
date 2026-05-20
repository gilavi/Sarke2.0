export const LIFTING_ACCESSORIES_TEMPLATE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

export type LAResult  = 'ok' | 'fail';
export type LAVerdict = 'pass' | 'repair' | 'fail';

export interface LAItemState {
  id: number;
  result: LAResult | null;
  comment: string | null;
  photo_paths: string[];
}

export interface LARemovedRow {
  id: string;
  serialNumber: string;
  typeDescription: string;
  reason: string;
}

export interface LASignatory {
  name: string;
  position: string;
  organization?: string;
  extra?: Record<string, string>;
  signature: string | null;
  date?: string | null;
}

export interface LiftingAccessoriesInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  // Section 1 — ზოგადი ინფო
  company: string;
  address: string;
  inspectorName: string;
  inspectionDate: string;
  // Section 2 — მოწყობილობის იდენტიფიკაცია
  equipmentTypes: string[];
  equipmentTypeOther: string;
  serialNumber: string;
  manufacturer: string;
  yearOfManufacture: string;
  markingStatus: string | null;
  wllKg: string;
  unitCount: string;
  nextInspectionDate: string | null;
  // Section 3 — შემოწმება (10 items)
  items: LAItemState[];
  // Section 4 — ამოღებული მოწყობილობები
  removedRows: LARemovedRow[];
  // Section 5 — დასკვნა
  verdict: LAVerdict | null;
  verdictComment: string;
  // Section 6 — ხელმოწერები
  signatures: LASignatory[];
  summaryPhotos: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Equipment type options ────────────────────────────────────────────────────

export const LA_EQUIPMENT_TYPES = [
  'ტექ. სლინგი',
  'მრგვ. სლინგი',
  'ბეწვ. სლინგი',
  'ჯაჭვ. სლინგი',
  'ჩამჭიდი',
  'კაუჭი',
  'სხვა',
] as const;

export type LAEquipmentType = (typeof LA_EQUIPMENT_TYPES)[number];

// The 'სხვა' option triggers a custom text input in the identification grid.
export const LA_OTHER_EQUIPMENT_VALUE = 'სხვა';

// ── Marking status options ────────────────────────────────────────────────────

export const LA_MARKING_OPTIONS = ['სრული', 'ნაწილობრივი', 'არ გააჩნია'] as const;

// ── Checklist catalog ─────────────────────────────────────────────────────────

export interface LAChecklistEntry {
  id: number;
  label: string;
  description: string;
  section: 'A' | 'B';
}

export const LA_CHECKLIST_ITEMS: LAChecklistEntry[] = [
  // Section A — ვიზუალური შემოწმება
  { id: 1, label: 'სლინგ./თასმ. სხეული', description: 'ჭრა, გახეთქვა, ცვეთა', section: 'A' },
  { id: 2, label: 'ბოლო ადაპტ./მარყ.', description: 'ფ-ა, სიმჭ., ვ/ო', section: 'A' },
  { id: 3, label: 'ნაკ./შეერთ. (ტექ.)', description: 'ნ/ო ჩ-ა, გქ. ელ.', section: 'A' },
  { id: 4, label: 'კოროზ./ქ-მ./სით.', description: 'ხ/ვ. დაზიანება', section: 'A' },
  { id: 5, label: 'დეფ./კვ./გ-ბ.', description: 'ფ-ის გადახ.', section: 'A' },
  // Section B — ფუნქციური შემოწმება
  { id: 6, label: 'ჩ-ი/კ-ი ბლოკ.', description: 'gate, pin, auto-lock', section: 'B' },
  { id: 7, label: 'ჯ-ვ. ბმ./ხვ. ც-ა', description: '', section: 'B' },
  { id: 8, label: 'ბ-ვ./ტ-ი ელ-ბ.', description: 'ბ-ბ. წყ., ე-ი დ-ა', section: 'B' },
  { id: 9, label: 'ეტ./ნ-ა (WLL, NN)', description: 'კ-ბ-ა', section: 'B' },
  { id: 10, label: 'სე-ტ./დ-ტ. გ-ბ.', description: '', section: 'B' },
];

/** Maps LAResult enum → chip display text. */
export const LA_RESULT_TO_CHIP: Record<LAResult, string> = {
  ok:   'გამართულია',
  fail: 'გაუმართავია',
};

/** Maps chip display text → LAResult (reverse of LA_RESULT_TO_CHIP). */
export const LA_CHIP_TO_RESULT: Record<string, LAResult> = {
  'გამართულია': 'ok',
  'გაუმართავია': 'fail',
};

export const LA_CHECKLIST_OPTIONS = {
  a: 'გამართულია',
  b: 'გაუმართავია',
} as const;

export const LA_VERDICT_LABELS: Record<LAVerdict, string> = {
  pass:   'ვარგისია გამოყენებისათვის',
  repair: 'პირობით ვარ. / მოითხ. შეკ.',
  fail:   'ამოღებულია სამ-ბ-ი.',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildDefaultLAItems(): LAItemState[] {
  return LA_CHECKLIST_ITEMS.map(e => ({
    id: e.id,
    result: null,
    comment: null,
    photo_paths: [],
  }));
}

export function buildDefaultLARemovedRow(): LARemovedRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    serialNumber: '',
    typeDescription: '',
    reason: '',
  };
}

function buildDefaultLASignatory(): LASignatory {
  return { name: '', position: '', organization: '', extra: {}, signature: null, date: null };
}

export function buildDefaultLAInspection(
  id: string,
  projectId: string,
  userId: string,
  templateId: string | null,
  now: string,
): LiftingAccessoriesInspection {
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
    equipmentTypes: [],
    equipmentTypeOther: '',
    serialNumber: '',
    manufacturer: '',
    yearOfManufacture: '',
    markingStatus: null,
    wllKg: '',
    unitCount: '',
    nextInspectionDate: null,
    items: buildDefaultLAItems(),
    removedRows: [],
    verdict: null,
    verdictComment: '',
    signatures: [buildDefaultLASignatory()],
    summaryPhotos: [],
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Derives a verdict suggestion from checklist results and marking status.
 * 'repair' is also auto-suggested when marking is partial.
 */
export function computeLAVerdictSuggestion(
  items: LAItemState[],
  markingStatus: string | null,
): LAVerdict | null {
  const filled = items.filter(i => i.result !== null).length;
  if (filled === 0) return null;
  if (items.some(i => i.result === 'fail')) return 'fail';
  if (markingStatus === LA_MARKING_OPTIONS[2]) return 'fail';
  if (markingStatus === LA_MARKING_OPTIONS[1]) return 'repair';
  return 'pass';
}
