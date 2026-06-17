// Mobile ladder inspection types - მობილური კიბის შემოწმების აქტი.
// DB-backed by `mobile_ladder_inspections` (migration 0045).
//
// Web mirror of the Expo app's `types/mobileLadder.ts` (kept in sync by hand; the
// `@root` import is eslint-banned). The single `signature` column is NOT written
// by the web data layer - captured inspection signatures are never persisted
// (regulatory); they live in result-screen state and are rasterized into the PDF.

export const MOBILE_LADDER_TEMPLATE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export type MLResult = 'safe' | 'damaged' | 'na';
export type MLVerdict = 'safe' | 'minor' | 'banned';

export interface MLItemState {
  id: number;
  result: MLResult | null;
  comment: string | null;
  photo_paths: string[];
}

export interface MobileLadderInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  company: string;
  address: string;
  inspectorName: string;
  inspectionDate: string;
  ladderType: string | null;
  model: string | null;
  heightM: number | null;
  maxLoadKg: number | null;
  nextInspectionDate: string | null;
  items: MLItemState[];
  verdict: MLVerdict | null;
  verdictComment: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MLChecklistEntry {
  id: number;
  label: string;
  description: string;
  section: 'A' | 'B';
}

export const ML_CHECKLIST_ITEMS: MLChecklistEntry[] = [
  { id: 1, label: 'კიბის ლიანდაგები', description: 'ხილვადი დეფორმაცია/ბზარი', section: 'A' },
  { id: 2, label: 'საფეხურები', description: 'მყარია, ზედაპირი მთლიანი', section: 'A' },
  { id: 3, label: 'შედუღება/შეერთებები', description: 'ბზარი/კოროზია', section: 'A' },
  { id: 4, label: 'კიბის ელემენტები (ჭანჭიკები, მობრჯენები)', description: 'სრულია', section: 'A' },
  { id: 5, label: 'გახსნის მექანიზმი', description: 'სწორად მუშაობს', section: 'A' },
  { id: 6, label: 'გორგოლაჭის ღერძები', description: 'თავისუფლად მოძრაობს, ჩარჩო მყარი', section: 'B' },
  { id: 7, label: 'სამუხრუჭე სისტემა / ბლოკირება', description: '', section: 'B' },
  { id: 8, label: 'კიბის ფეხები (სტაბილიზატორები)', description: '', section: 'B' },
];

export const ML_SECTION_LABELS: Record<'A' | 'B', string> = {
  A: 'A - სტრუქტურული მდგომარეობა',
  B: 'B - სამობილო სისტემა',
};

export const ML_RESULT_TO_CHIP: Record<MLResult, string> = {
  safe: 'უსაფრთხოა',
  damaged: 'დაზიანებულია',
  na: 'არ გეკუთვნება',
};

export const ML_VERDICT_LABELS: Record<MLVerdict, string> = {
  safe: 'უსაფრთხოა გამოსაყენებლად',
  minor: 'მცირე დაზიანება - დასაშვებია',
  banned: 'დაზიანებულია - აკრძალულია',
};

export function buildDefaultMLItems(): MLItemState[] {
  return ML_CHECKLIST_ITEMS.map((e) => ({ id: e.id, result: null, comment: null, photo_paths: [] }));
}
