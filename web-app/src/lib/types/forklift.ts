// Forklift inspection types — ჩანგლიანი დამტვირთველის შემოწმების აქტი.
// DB-backed by `forklift_inspections` (migration 0047).
//
// Web mirror of the Expo app's `types/forklift.ts` (kept in sync by hand; the
// `@root` import is eslint-banned). The persisted signer signature is NOT written
// by the web data layer (regulatory).

export const FORKLIFT_TEMPLATE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

export type ForkliftItemResult = 'good' | 'deficient' | 'unusable';
export type ForkliftVerdict = 'approved' | 'limited' | 'rejected';
export type ForkliftCategory = 'A' | 'B' | 'C';
export type ForkliftEngineType = 'electric' | 'gasoline' | 'diesel' | 'gas';

export interface ForkliftItemState {
  id: number;
  result: ForkliftItemResult | null;
  comment: string | null;
  photo_paths: string[];
}

export interface ForkliftInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  company: string | null;
  address: string | null;
  inventoryNumber: string | null;
  brandModel: string | null;
  engineType: ForkliftEngineType | null;
  inspectionDate: string;
  inspectorName: string | null;
  items: ForkliftItemState[];
  verdict: ForkliftVerdict | null;
  notes: string | null;
  summaryPhotos: string[];
  qualDocPath: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForkliftChecklistEntry {
  id: number;
  category: ForkliftCategory;
  label: string;
  description: string;
}

export const FORKLIFT_ITEMS: ForkliftChecklistEntry[] = [
  { id: 1, category: 'A', label: 'ამწ. ანძა', description: 'სვეტის პროფილები — ბზარი, დეფორმ.' },
  { id: 2, category: 'A', label: 'ამწ. ანძა', description: 'სახსრული შეერთებები — ბზარი, ცვეთა' },
  { id: 3, category: 'A', label: 'ეტლი', description: 'სვეტზე სრიალი — გლუვი / ჭახჭახი' },
  { id: 4, category: 'A', label: 'ჰიდრ. ცილ.', description: 'ნაჟური / გაბერილი ბზარი' },
  { id: 5, category: 'A', label: 'ჰიდრ. შლ.', description: 'ბზარი, გაჭრა, მჭიდრობა' },
  { id: 6, category: 'A', label: 'ჰიდრ. ზეთი', description: 'ზეთის დონე — კრიტიკ. ზღვარი' },
  { id: 7, category: 'A', label: 'ამწ. სისტ.', description: 'ამწევი/დამწევი სისტემა — შენელება' },
  { id: 8, category: 'A', label: 'დახრ. (tilt)', description: 'დახრის ფუნქცია — წინ/უკან' },
  { id: 9, category: 'B', label: 'ჩანგლები', description: 'სიგრძე — ბზარი' },
  { id: 10, category: 'B', label: 'ჩანგლები', description: 'სისქე — ცვეთა 10%+' },
  { id: 11, category: 'B', label: 'ჩანგლები', description: 'ჰორიზ. კუთხე — დეფ.' },
  { id: 12, category: 'B', label: 'ეტლი', description: 'ჩანგლების გამაგრება / ბლოკ.' },
  { id: 13, category: 'B', label: 'ჩანგლები', description: 'Heel pin — ადგილზეა' },
  { id: 14, category: 'B', label: 'წინა თვლ.', description: 'ცვეთა, ბზარი / გაჭ.' },
  { id: 15, category: 'B', label: 'წინა თვლ.', description: 'ქანჩები — მოშვ.' },
  { id: 16, category: 'B', label: 'საჭის თვლ.', description: 'ცვეთა, ბზარი' },
  { id: 17, category: 'B', label: 'საჭის თვლ.', description: 'ქანჩები — მოშვ.' },
  { id: 18, category: 'B', label: 'სამუხრ. პედ.', description: 'ეფექტი / ჩავარდ.' },
  { id: 19, category: 'B', label: 'სადგ. მუხრ.', description: 'სრულად აჩერ.' },
  { id: 20, category: 'B', label: 'მუხრ. ხუნდ.', description: 'გაცვეთა' },
  { id: 21, category: 'C', label: 'სავარძელი', description: 'მაგარი / რეგულ.' },
  { id: 22, category: 'C', label: 'OH Guard', description: 'ბზარი / დეფ.' },
  { id: 23, category: 'C', label: 'საჭე', description: 'ლაფსუსი ≤15°' },
  { id: 24, category: 'C', label: 'საჭე', description: 'ბრუნვა გლუვი' },
  { id: 25, category: 'C', label: 'ბერკეტები', description: 'ჰიდრ. ბერკეტები — ეტიკეტები' },
  { id: 26, category: 'C', label: 'სიჩქ. შემზღ.', description: 'სიჩქარის შემზღუდველი' },
  { id: 27, category: 'C', label: 'სარკეები', description: 'ორი გვერდი — სუფთა, სწ. კუთხე' },
  { id: 28, category: 'C', label: 'ძრავ./ბატ.', description: 'ძრავ./ბატ. ზეთის დონე' },
  { id: 29, category: 'C', label: 'ზეთ./მჟავ.', description: 'ნაჟური ან მჟავ. დენა' },
  { id: 30, category: 'C', label: 'გამაგრ. სთხ.', description: 'გამაგრილ. სითხე — ნორმ.' },
  { id: 31, category: 'C', label: 'ბატარეა', description: 'გაწყვეტ. / დეფ.' },
  { id: 32, category: 'C', label: 'ინდიკ.', description: 'გამშვ./ჩამრთ./ინდიკ. — ნორმ.' },
  { id: 33, category: 'C', label: 'განათება', description: 'წინა / უკანა — ნორმ.' },
  { id: 34, category: 'C', label: 'უკუსვლ. სიგ.', description: 'ხმოვანი სიგნალი' },
  { id: 35, category: 'C', label: 'სახანძრო', description: 'სახანძრო მოწყობ. — ვადა, ადგ.' },
  { id: 36, category: 'C', label: 'ძირ. ჩარჩო', description: 'ბზარი / დეფ.' },
  { id: 37, category: 'C', label: 'კონტრბალ.', description: 'კონტრბალანსი — მყარად' },
  { id: 38, category: 'C', label: 'სატვ. ფირფ.', description: 'სატვირთო ფირფიტა — წაკითხ.' },
  { id: 39, category: 'C', label: 'ბატ. (ელ.)', description: 'ბატარეა (ელ.) — დეტ.' },
];

export const FORKLIFT_CATEGORY_LABELS: Record<ForkliftCategory, string> = {
  A: 'A — სამაგრი სვეტი / ჰიდრავლიკა',
  B: 'B — ჩანგლები / ეტლი / თვლები / მუხრუჭი',
  C: 'C — კაბინა / საჭე / უსაფრთხოება',
};

export const ENGINE_TYPE_LABEL: Record<ForkliftEngineType, string> = {
  electric: 'ელექტრო',
  gasoline: 'ბენზინი',
  diesel: 'დიზელი',
  gas: 'გაზი',
};

export const FORKLIFT_VERDICT_LABEL: Record<ForkliftVerdict, string> = {
  approved: 'გამოყენებისათვის დაშვებულია',
  limited: 'შეზღ. გამოყენება — ჩამ. ხარვეზებით',
  rejected: 'გამოყენება დაუშვ. — ტექ.მომსახ.',
};

export function buildDefaultForkliftItems(): ForkliftItemState[] {
  return FORKLIFT_ITEMS.map((item) => ({ id: item.id, result: null, comment: null, photo_paths: [] }));
}
