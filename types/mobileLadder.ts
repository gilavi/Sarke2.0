export const MOBILE_LADDER_TEMPLATE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export type MLResult  = 'safe' | 'damaged' | 'na';
export type MLVerdict = 'safe' | 'minor' | 'banned';

export interface MLItemState {
  id: number;
  result: MLResult | null;
  comment: string | null;
  photo_paths: string[];
}

export interface MLSignatory {
  name: string;
  position: string;
  signature: string | null;
  date: string | null;
}

export interface MobileLadderInspection {
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
  // Section 2 - კიბის იდენტიფიკაცია
  ladderType: string | null;
  ladderTypeUnknown: boolean;
  model: string | null;
  modelUnknown: boolean;
  heightM: number | null;
  heightUnknown: boolean;
  maxLoadKg: number | null;
  maxLoadUnknown: boolean;
  nextInspectionDate: string | null;
  // Sections 3–4 - შემოწმება (8 items: 5 in A, 3 in B)
  items: MLItemState[];
  // Section 5 - დასკვნა
  verdict: MLVerdict | null;
  verdictComment: string;
  // General photos attached on the conclusion step
  summaryPhotos: string[];
  // Section 6 - ხელმოწერა
  signature: MLSignatory;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Checklist catalog ─────────────────────────────────────────────────────────

export interface MLChecklistEntry {
  id: number;
  label: string;
  description: string;
  section: 'A' | 'B';
}

export const ML_CHECKLIST_ITEMS: MLChecklistEntry[] = [
  // Section A - სტრუქტურული მდგომარეობა
  { id: 1, label: 'კიბის ლიანდაგები', description: 'ხილვადი დეფორმაცია/ბზარი', section: 'A' },
  { id: 2, label: 'საფეხურები', description: 'მყარია, ზედაპირი მთლიანი', section: 'A' },
  { id: 3, label: 'შედუღება/შეერთებები', description: 'ბზარი/კოროზია', section: 'A' },
  { id: 4, label: 'კიბის ელემენტები (ჭანჭიკები, მობრჯენები)', description: 'სრულია', section: 'A' },
  { id: 5, label: 'გახსნის მექანიზმი', description: 'სწორად მუშაობს', section: 'A' },
  // Section B - სამობილო სისტემა
  { id: 6, label: 'გორგოლაჭის ღერძები', description: 'თავისუფლად მოძრაობს, ჩარჩო მყარი', section: 'B' },
  { id: 7, label: 'სამუხრუჭე სისტემა / ბლოკირება', description: '', section: 'B' },
  { id: 8, label: 'კიბის ფეხები (სტაბილიზატორები)', description: '', section: 'B' },
];

/** Maps MLResult enum → chip display text (used in ChecklistSection options). */
export const ML_RESULT_TO_CHIP: Record<MLResult, string> = {
  safe:    'უსაფრთხოა',
  damaged: 'დაზიანებულია',
  na:      'არ გეკუთვნება',
};

/** Maps chip display text → MLResult (reverse of ML_RESULT_TO_CHIP). */
export const ML_CHIP_TO_RESULT: Record<string, MLResult> = {
  'უსაფრთხოა':     'safe',
  'დაზიანებულია':  'damaged',
  'არ გეკუთვნება': 'na',
};

export const ML_VERDICT_LABELS: Record<MLVerdict, string> = {
  safe:   'უსაფრთხოა გამოსაყენებლად',
  minor:  'მცირე დაზიანება - დასაშვებია',
  banned: 'დაზიანებულია - აკრძალულია',
};

/** Shared ChecklistItemOptions constant for all ML checklist items. */
export const ML_CHECKLIST_OPTIONS = {
  a: 'უსაფრთხოა',
  b: 'დაზიანებულია',
  c: 'არ გეკუთვნება',
  cIsNeutral: true,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildDefaultMLItems(): MLItemState[] {
  return ML_CHECKLIST_ITEMS.map(e => ({
    id: e.id,
    result: null,
    comment: null,
    photo_paths: [],
  }));
}

export function buildDefaultMLSignatory(): MLSignatory {
  return { name: '', position: '', signature: null, date: null };
}

export function buildDefaultMLInspection(
  id: string,
  projectId: string,
  userId: string,
  templateId: string | null,
  now: string,
): MobileLadderInspection {
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
    ladderType: null,
    ladderTypeUnknown: false,
    model: null,
    modelUnknown: false,
    heightM: null,
    heightUnknown: false,
    maxLoadKg: null,
    maxLoadUnknown: false,
    nextInspectionDate: null,
    items: buildDefaultMLItems(),
    verdict: null,
    verdictComment: '',
    summaryPhotos: [],
    signature: buildDefaultMLSignatory(),
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Derives a verdict suggestion from checklist results.
 * 'minor' is never suggested - only set manually by the inspector.
 */
export function computeMLVerdictSuggestion(items: MLItemState[]): MLVerdict | null {
  const filled = items.filter(i => i.result !== null);
  if (filled.length === 0) return null;
  if (items.some(i => i.result === 'damaged')) return 'banned';
  return 'safe';
}
