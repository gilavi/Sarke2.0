// Lifting accessories inspection types — ტვირთის გადასატანი თასმების / ჩამჭიდების.
// DB-backed by `lifting_accessories_inspections` (migration 0049).
//
// Web mirror of the Expo app's `types/liftingAccessories.ts` (kept in sync by
// hand; the `@root` import is eslint-banned). The persisted `signatures` column
// is NOT written by the web data layer (regulatory).

export const LIFTING_ACCESSORIES_TEMPLATE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

export type LAResult = 'ok' | 'fail';
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

export interface LiftingAccessoriesInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  company: string;
  address: string;
  inspectorName: string;
  inspectionDate: string;
  equipmentTypes: string[];
  equipmentTypeOther: string;
  serialNumber: string;
  manufacturer: string;
  yearOfManufacture: string;
  markingStatus: string | null;
  wllKg: string;
  unitCount: string;
  nextInspectionDate: string | null;
  items: LAItemState[];
  removedRows: LARemovedRow[];
  verdict: LAVerdict | null;
  verdictComment: string;
  summaryPhotos: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const LA_MARKING_OPTIONS = ['სრული', 'ნაწილობრივი', 'არ გააჩნია'] as const;

export interface LAChecklistEntry {
  id: number;
  label: string;
  description: string;
  section: 'A' | 'B';
}

export const LA_CHECKLIST_ITEMS: LAChecklistEntry[] = [
  { id: 1, label: 'სლინგ./თასმ. სხეული', description: 'ჭრა, გახეთქვა, ცვეთა', section: 'A' },
  { id: 2, label: 'ბოლო ადაპტ./მარყ.', description: 'ფ-ა, სიმჭ., ვ/ო', section: 'A' },
  { id: 3, label: 'ნაკ./შეერთ. (ტექ.)', description: 'ნ/ო ჩ-ა, გქ. ელ.', section: 'A' },
  { id: 4, label: 'კოროზ./ქ-მ./სით.', description: 'ხ/ვ. დაზიანება', section: 'A' },
  { id: 5, label: 'დეფ./კვ./გ-ბ.', description: 'ფ-ის გადახ.', section: 'A' },
  { id: 6, label: 'ჩ-ი/კ-ი ბლოკ.', description: 'gate, pin, auto-lock', section: 'B' },
  { id: 7, label: 'ჯ-ვ. ბმ./ხვ. ც-ა', description: '', section: 'B' },
  { id: 8, label: 'ბ-ვ./ტ-ი ელ-ბ.', description: 'ბ-ბ. წყ., ე-ი დ-ა', section: 'B' },
  { id: 9, label: 'ეტ./ნ-ა (WLL, NN)', description: 'კ-ბ-ა', section: 'B' },
  { id: 10, label: 'სე-ტ./დ-ტ. გ-ბ.', description: '', section: 'B' },
];

export const LA_SECTION_LABELS: Record<'A' | 'B', string> = {
  A: 'A — ვიზუალური შემოწმება',
  B: 'B — ფუნქციური შემოწმება',
};

export const LA_RESULT_TO_CHIP: Record<LAResult, string> = {
  ok: 'გამართულია',
  fail: 'გაუმართავია',
};

export const LA_VERDICT_LABELS: Record<LAVerdict, string> = {
  pass: 'ვარგისია გამოყენებისათვის',
  repair: 'პირობით ვარ. / მოითხ. შეკ.',
  fail: 'ამოღებულია სამ-ბ-ი.',
};

export function buildDefaultLAItems(): LAItemState[] {
  return LA_CHECKLIST_ITEMS.map((e) => ({ id: e.id, result: null, comment: null, photo_paths: [] }));
}
