// ჩანგლიანი დამტვირთველის შემოწმების აქტი (Forklift Inspection)
// DB-backed by `forklift_inspections` table (migration 0047).

export type ForkliftItemResult = 'good' | 'deficient' | 'unusable';
export type ForkliftVerdict = 'approved' | 'limited' | 'rejected';
export type ForkliftCategory = 'A' | 'B' | 'C';
export type ForkliftEngineType = 'electric' | 'gasoline' | 'diesel' | 'gas';

export const FORKLIFT_TEMPLATE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

export interface ForkliftItemState {
  id: number;
  result: ForkliftItemResult | null;
  comment: string | null;
  /** Storage paths in `answer-photos` bucket: forklift/{inspectionId}/{itemId}/{uuid}.jpg */
  photo_paths: string[];
}

export interface ForkliftInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  // Section I - identification
  company: string | null;
  address: string | null;
  inventoryNumber: string | null;
  brandModel: string | null;
  engineType: ForkliftEngineType | null;
  inspectionDate: string; // ISO date string
  inspectorName: string | null;
  // Section III - checklist (39 items)
  items: ForkliftItemState[];
  // Section IV - verdict
  verdict: ForkliftVerdict | null;
  notes: string | null;
  summaryPhotos: string[];
  qualDocPath: string | null;
  // Section V - extended signature
  signerName: string | null;
  signerPosition: string | null;
  signerPhone: string | null;
  signerSignature: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForkliftChecklistEntry {
  id: number;
  category: ForkliftCategory;
  /** Short category label shown in the checklist row */
  label: string;
  /** Full description text */
  description: string;
}

// ── Checklist items - 39 total ────────────────────────────────────────────────

export const FORKLIFT_ITEMS: ForkliftChecklistEntry[] = [
  // A - სამაგრი სვეტი / ჰიდრავლიკა (8 items)
  { id: 1,  category: 'A', label: 'ამწ. ანძა',    description: 'სვეტის პროფილები - ბზარი, დეფორმ.' },
  { id: 2,  category: 'A', label: 'ამწ. ანძა',    description: 'სახსრული შეერთებები - ბზარი, ცვეთა' },
  { id: 3,  category: 'A', label: 'ეტლი',         description: 'სვეტზე სრიალი - გლუვი / ჭახჭახი' },
  { id: 4,  category: 'A', label: 'ჰიდრ. ცილ.',  description: 'ნაჟური / გაბერილი ბზარი' },
  { id: 5,  category: 'A', label: 'ჰიდრ. შლ.',   description: 'ბზარი, გაჭრა, მჭიდრობა' },
  { id: 6,  category: 'A', label: 'ჰიდრ. ზეთი',  description: 'ზეთის დონე - კრიტიკ. ზღვარი' },
  { id: 7,  category: 'A', label: 'ამწ. სისტ.',   description: 'ამწევი/დამწევი სისტემა - შენელება' },
  { id: 8,  category: 'A', label: 'დახრ. (tilt)',  description: 'დახრის ფუნქცია - წინ/უკან' },
  // B - ჩანგლები / ეტლი / თვლები / მუხრუჭი (12 items)
  { id: 9,  category: 'B', label: 'ჩანგლები',     description: 'სიგრძე - ბზარი' },
  { id: 10, category: 'B', label: 'ჩანგლები',     description: 'სისქე - ცვეთა 10%+' },
  { id: 11, category: 'B', label: 'ჩანგლები',     description: 'ჰორიზ. კუთხე - დეფ.' },
  { id: 12, category: 'B', label: 'ეტლი',         description: 'ჩანგლების გამაგრება / ბლოკ.' },
  { id: 13, category: 'B', label: 'ჩანგლები',     description: 'Heel pin - ადგილზეა' },
  { id: 14, category: 'B', label: 'წინა თვლ.',    description: 'ცვეთა, ბზარი / გაჭ.' },
  { id: 15, category: 'B', label: 'წინა თვლ.',    description: 'ქანჩები - მოშვ.' },
  { id: 16, category: 'B', label: 'საჭის თვლ.',   description: 'ცვეთა, ბზარი' },
  { id: 17, category: 'B', label: 'საჭის თვლ.',   description: 'ქანჩები - მოშვ.' },
  { id: 18, category: 'B', label: 'სამუხრ. პედ.', description: 'ეფექტი / ჩავარდ.' },
  { id: 19, category: 'B', label: 'სადგ. მუხრ.',  description: 'სრულად აჩერ.' },
  { id: 20, category: 'B', label: 'მუხრ. ხუნდ.',  description: 'გაცვეთა' },
  // C - კაბინა / საჭე / უსაფრთხოება (19 items)
  { id: 21, category: 'C', label: 'სავარძელი',    description: 'მაგარი / რეგულ.' },
  { id: 22, category: 'C', label: 'OH Guard',      description: 'ბზარი / დეფ.' },
  { id: 23, category: 'C', label: 'საჭე',          description: 'ლაფსუსი ≤15°' },
  { id: 24, category: 'C', label: 'საჭე',          description: 'ბრუნვა გლუვი' },
  { id: 25, category: 'C', label: 'ბერკეტები',    description: 'ჰიდრ. ბერკეტები - ეტიკეტები' },
  { id: 26, category: 'C', label: 'სიჩქ. შემზღ.', description: 'სიჩქარის შემზღუდველი' },
  { id: 27, category: 'C', label: 'სარკეები',      description: 'ორი გვერდი - სუფთა, სწ. კუთხე' },
  { id: 28, category: 'C', label: 'ძრავ./ბატ.',   description: 'ძრავ./ბატ. ზეთის დონე' },
  { id: 29, category: 'C', label: 'ზეთ./მჟავ.',   description: 'ნაჟური ან მჟავ. დენა' },
  { id: 30, category: 'C', label: 'გამაგრ. სთხ.', description: 'გამაგრილ. სითხე - ნორმ.' },
  { id: 31, category: 'C', label: 'ბატარეა',       description: 'გაწყვეტ. / დეფ.' },
  { id: 32, category: 'C', label: 'ინდიკ.',        description: 'გამშვ./ჩამრთ./ინდიკ. - ნორმ.' },
  { id: 33, category: 'C', label: 'განათება',      description: 'წინა / უკანა - ნორმ.' },
  { id: 34, category: 'C', label: 'უკუსვლ. სიგ.', description: 'ხმოვანი სიგნალი' },
  { id: 35, category: 'C', label: 'სახანძრო',      description: 'სახანძრო მოწყობ. - ვადა, ადგ.' },
  { id: 36, category: 'C', label: 'ძირ. ჩარჩო',   description: 'ბზარი / დეფ.' },
  { id: 37, category: 'C', label: 'კონტრბალ.',     description: 'კონტრბალანსი - მყარად' },
  { id: 38, category: 'C', label: 'სატვ. ფირფ.',   description: 'სატვირთო ფირფიტა - წაკითხ.' },
  { id: 39, category: 'C', label: 'ბატ. (ელ.)',    description: 'ბატარეა (ელ.) - დეტ.' },
];

export const FORKLIFT_CATEGORY_LABELS: Record<ForkliftCategory, string> = {
  A: 'A - სამაგრი სვეტი / ჰიდრავლიკა',
  B: 'B - ჩანგლები / ეტლი / თვლები / მუხრუჭი',
  C: 'C - კაბინა / საჭე / უსაფრთხოება',
};

export const ENGINE_TYPE_LABEL: Record<ForkliftEngineType, string> = {
  electric: 'ელექტრო',
  gasoline: 'ბენზინი',
  diesel:   'დიზელი',
  gas:      'გაზი',
};

export const FORKLIFT_VERDICT_LABEL: Record<ForkliftVerdict, string> = {
  approved: 'გამოყენებისათვის დაშვებულია',
  limited:  'შეზღ. გამოყენება - ჩამ. ხარვეზებით',
  rejected: 'გამოყენება დაუშვ. - ტექ.მომსახ.',
};

/** Component diagram labels (static info, A-K). */
export const FORKLIFT_COMPONENTS: { key: string; label: string }[] = [
  { key: 'A', label: 'ამწევი ანძა (Mast)' },
  { key: 'B', label: 'ჰიდრ. ცილინდრი' },
  { key: 'C', label: 'ეტლი (Carriage)' },
  { key: 'D', label: 'ჩანგლები (Forks)' },
  { key: 'E', label: 'დახრ. ცილინდრი (Tilt Cyl.)' },
  { key: 'F', label: 'საჭე / სავარძელი' },
  { key: 'G', label: 'OH Guard' },
  { key: 'H', label: 'კონტრბალანსი' },
  { key: 'I', label: 'წინა თვლები' },
  { key: 'J', label: 'საჭის თვლები' },
  { key: 'K', label: 'სამუხრუჭე სისტ.' },
];

// ── Summary table subcategory → item ID mapping ───────────────────────────────

export const FORKLIFT_SUMMARY_CATS: { label: string; ids: number[] }[] = [
  { label: 'ჩანგლები/ეტლი',    ids: [9, 10, 11, 12, 13] },
  { label: 'ამწ.ანძა/MAST',     ids: [1, 2, 3] },
  { label: 'ჰიდრ.ცილ./შლანგ.', ids: [4, 5, 6, 7] },
  { label: 'დახრ.ცილინდ.',      ids: [8] },
  { label: 'წინა თვლები',       ids: [14, 15] },
  { label: 'საჭის თვლები',      ids: [16, 17] },
  { label: 'პედ.მუხრ.',         ids: [18] },
  { label: 'მექ.მუხრ.',         ids: [19, 20] },
  { label: 'ძრ./ელ.',           ids: [28, 29, 30] },
  { label: 'ბატარეა',           ids: [31, 39] },
  { label: 'საჭე',              ids: [23, 24] },
  { label: 'OH Guard',          ids: [22] },
  { label: 'კონტრბალ.',         ids: [37] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build the default (all-null) items state. */
export function buildDefaultForkliftItems(): ForkliftItemState[] {
  return FORKLIFT_ITEMS.map(item => ({
    id: item.id,
    result: null,
    comment: null,
    photo_paths: [],
  }));
}

/**
 * Suggest a verdict based on filled item results.
 * Any 'unusable' → rejected; any 'deficient' → limited; all 'good' → approved.
 */
export function computeForkliftVerdictSuggestion(
  items: ForkliftItemState[],
): ForkliftVerdict | null {
  const filled = items.filter(i => i.result !== null);
  if (filled.length === 0) return null;
  if (filled.some(i => i.result === 'unusable'))  return 'rejected';
  if (filled.some(i => i.result === 'deficient')) return 'limited';
  if (filled.every(i => i.result === 'good'))     return 'approved';
  return null;
}

export interface ForkliftCounts {
  good: number;
  deficient: number;
  unusable: number;
}

/** Count results for a given set of item IDs. */
export function forkliftSubcategoryCounts(
  items: ForkliftItemState[],
  ids: number[],
): ForkliftCounts {
  const subset = items.filter(i => ids.includes(i.id));
  return {
    good:      subset.filter(i => i.result === 'good').length,
    deficient: subset.filter(i => i.result === 'deficient').length,
    unusable:  subset.filter(i => i.result === 'unusable').length,
  };
}
