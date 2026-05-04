// Bobcat / Skid-Steer and Large Loader inspection types.
// DB-backed by `bobcat_inspections` table (migration 0024).
// Both template variants share the same table; templateId distinguishes them.

export type BobcatItemResult = 'good' | 'deficient' | 'unusable';
export type BobcatInspectionType = 'pre_work' | 'scheduled' | 'other';
export type BobcatVerdict = 'approved' | 'limited' | 'rejected';
export type BobcatCategory = 'A' | 'B' | 'C' | 'D';

export const BOBCAT_TEMPLATE_ID = '33333333-3333-3333-3333-333333333333';
export const LARGE_LOADER_TEMPLATE_ID = '44444444-4444-4444-4444-444444444444';

export interface BobcatItemState {
  id: number;
  result: BobcatItemResult | null;
  comment: string | null;
  /** Storage paths in `answer-photos` bucket: bobcat/{inspectionId}/{itemId}/{uuid}.jpg */
  photo_paths: string[];
}

export interface BobcatInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  // Section I
  company: string | null;
  address: string | null;
  equipmentModel: string | null;
  registrationNumber: string | null;
  inspectionDate: string; // ISO date string
  inspectionType: BobcatInspectionType | null;
  inspectorName: string | null;
  // Section III
  items: BobcatItemState[];
  // Section IV
  verdict: BobcatVerdict | null;
  notes: string | null;
  // Section V
  inspectorSignature: string | null;
  summaryPhotos?: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BobcatChecklistEntry {
  id: number;
  category: BobcatCategory;
  /** Bold prefix label, e.g. "თვლები" */
  label: string;
  /** Full description after the separator */
  description: string;
  /** Extra help text shown in the bottom sheet when user taps "?" */
  helpText?: string;
  /**
   * Custom label for the 3rd (unusable) chip.
   * Defaults to "გამოუსადეგ." when absent.
   */
  unusableLabel?: string;
  /**
   * When true, selecting "unusable" on this item is treated as neutral
   * (e.g. "not present") and does NOT count toward a rejected verdict.
   */
  unusableIsNeutral?: boolean;
}

// ── Bobcat (Skid-Steer) — 30 items ──────────────────────────────────────────

export const BOBCAT_ITEMS: BobcatChecklistEntry[] = [
  // Category A — თვლები და სამუხრუჭე სისტემა
  { id: 1,  category: 'A', label: 'თვლები',   description: '4 თვლის საბურავის მდგომარეობა — გარეგნული დაზიანება, ბზარი' },
  { id: 2,  category: 'A', label: 'თვლები',   description: 'საბურავების წნევა — ვიზუალურად ნორმაშია' },
  { id: 3,  category: 'A', label: 'თვლები',   description: 'საბურავის ჭანჭიკები — მოჭიმულია, დაკარგული ბოლტი არ არის' },
  { id: 4,  category: 'A', label: 'მუხრუჭი',  description: 'სამუხრუჭე პედალი — ნორმაშია, ჩავარდნა არ ჩანს' },
  { id: 5,  category: 'A', label: 'მუხრუჭი',  description: 'სადგომი მუხრუჭი (parking brake) — ნორმაშია' },
  // Category B — ციცხვი, მკლავი და ჰიდრავლიკა
  { id: 6,  category: 'B', label: 'ციცხვი',   description: 'ციცხვის კბილები — ცვეთა, ბზარი, დაკარგული კბილი' },
  { id: 7,  category: 'B', label: 'ციცხვი',   description: 'ციცხვი ფირფიტა — ცვეთა 50%-ზე ნაკლებია თუ მეტი' },
  { id: 8,  category: 'B', label: 'მკლავი',   description: 'მკლავი — ბზარი, მოხრა ჩანს' },
  { id: 9,  category: 'B', label: 'ჰიდრავლ.', description: 'ჰიდ. ცილინდრები — ნაჟური/დენა ჩანს' },
  { id: 10, category: 'B', label: 'ჰიდრავლ.', description: 'ჰიდ. შლანგები — ბზარი, ხახუნი, დენა აღენიშნება' },
  { id: 11, category: 'B', label: 'ჰიდრავლ.', description: 'ჰიდ. ზეთის დონე — ნორმაშია მაჩვენებლის მიხედვით' },
  { id: 12, category: 'B', label: 'ჰიდრავლ.', description: 'ამომწევი/ჩამომწევი ფუნქცია — გლუვი, ჭახჭახი/ვიბრირება' },
  { id: 13, category: 'B', label: 'ჰიდრავლ.', description: 'ციცხვის დახრის ფუნქცია — ნორმაში' },
  // Category C — ძრავი (გარეგნული შემოწმება)
  { id: 14, category: 'C', label: 'ძრავი',    description: 'ძრავის ზეთის დონე — ზეთმზომი ნორმის ფარგლებში' },
  { id: 15, category: 'C', label: 'ძრავი',    description: 'გამაგრილებელი სითხე — საჰაერო სარეზერვუარო ნორმაშია' },
  { id: 16, category: 'C', label: 'ძრავი',    description: 'ძრავის გარეგნული ნაჟური — ზეთი, სითხე იღვრება' },
  { id: 17, category: 'C', label: 'ძრავი',    description: 'ჰაერის ფილტრის ინდიკატორი — წითელი სიგნალი არ ანათებს' },
  { id: 18, category: 'C', label: 'ძრავი',    description: 'ამომშვები მილი (exhaust) — შავი კვამლი, ნაჟური არ ჩანს' },
  { id: 19, category: 'C', label: 'ძრავი',    description: 'საწვავის სისტემა ბაკი — ნაჟური, ბზარი' },
  // Category D — კაბინა, მართვა, უსაფრთხოება
  { id: 20, category: 'D', label: 'კაბინა',   description: 'კარები — ნორმაშია' },
  { id: 21, category: 'D', label: 'კაბინა',   description: 'მინები — სუფთა, ბზარი, დაზიანება ჩანს' },
  { id: 22, category: 'D', label: 'კაბინა',   description: 'სავარძელი — მაგარია, ფუნქციონარი მუშაობს' },
  { id: 23, category: 'D', label: 'მართვა',   description: 'ბერკეტები/ჯოისტიკი/მართვის პანელი' },
  { id: 24, category: 'D', label: 'მართვა',   description: 'ყველა გამშვები/ინდიკატორი — მუშაობს, გაფრთხილება არ ჩანს' },
  { id: 25, category: 'D', label: 'მართვა',   description: 'სიგნალი/ჰორნი — მუშაობს' },
  { id: 26, category: 'D', label: 'განათება', description: 'ყველა შუქი: წინა/უკანა, ციმციმა — მუშაობს' },
  { id: 27, category: 'D', label: 'უსაფრ.',   description: 'სარკეები — ორი გვერდი, სუფთა, კუთხე სწორია' },
  { id: 28, category: 'D', label: 'უსაფრ.',   description: 'ტვირთის მაჩვენებელი ფირფიტა (load plate) — ხილვადია' },
  { id: 29, category: 'D', label: 'უსაფრ.',   description: 'უსაფრთხოების ქამარი — ადგილზე, ვადა ნორმაშია' },
  { id: 30, category: 'D', label: 'უსაფრ.',   description: 'ასასვლელი კიბე — მყარია' },
];

// ── Large Loader — 33 items (IDs 1-32 + 40) ──────────────────────────────────
//
// Derived from BOBCAT_ITEMS with:
//   • Cat B: new item #10 (Z-bar mechanism) inserted; old #10-13 → #11-14
//   • Cat C: old #14-19 → #15-20
//   • Cat D: old #20-30 → #21-31, then three description replacements:
//       #28 (was: სარკეები)    → კარები, სარეზინები
//       #30 (was: ქამარი)      → სავარძელი + სარტყელი
//       #31 (was: ასასვლელი)  → ბერკეტები/ჯოისტიკი return-to-centre
//   • New #32: საჭე (steering)
//   • New #40: უკუსვლის ვიდეო თვალი — neutral 3rd option "არ გააჩნია"

export const LARGE_LOADER_ITEMS: BobcatChecklistEntry[] = [
  // A — same as bobcat
  { id: 1,  category: 'A', label: 'თვლები',    description: '4 თვლის საბურავის მდგომარეობა — გარეგნული დაზიანება, ბზარი' },
  { id: 2,  category: 'A', label: 'თვლები',    description: 'საბურავების წნევა — ვიზუალურად ნორმაშია' },
  { id: 3,  category: 'A', label: 'თვლები',    description: 'საბურავის ჭანჭიკები — მოჭიმულია, დაკარგული ბოლტი არ არის' },
  { id: 4,  category: 'A', label: 'მუხრუჭი',   description: 'სამუხრუჭე პედალი — ნორმაშია, ჩავარდნა არ ჩანს' },
  { id: 5,  category: 'A', label: 'მუხრუჭი',   description: 'სადგომი მუხრუჭი (parking brake) — ნორმაშია' },
  // B — new #10 (Z-bar); old #10-13 → #11-14
  { id: 6,  category: 'B', label: 'ციცხვი',    description: 'ციცხვის კბილები — ცვეთა, ბზარი, დაკარგული კბილი' },
  { id: 7,  category: 'B', label: 'ციცხვი',    description: 'ციცხვი ფირფიტა — ცვეთა 50%-ზე ნაკლებია თუ მეტი' },
  { id: 8,  category: 'B', label: 'მკლავი',    description: 'მკლავი — ბზარი, მოხრა ჩანს' },
  { id: 9,  category: 'B', label: 'ჰიდრავლ.', description: 'ჰიდ. ცილინდრები — ნაჟური/დენა ჩანს' },
  { id: 10, category: 'B', label: 'მკლავი',    description: 'Z-bar მექანიზმი — ბმული, ბოლტები მოჭიმულია' },
  { id: 11, category: 'B', label: 'ჰიდრავლ.', description: 'ჰიდ. შლანგები — ბზარი, ხახუნი, დენა აღენიშნება' },
  { id: 12, category: 'B', label: 'ჰიდრავლ.', description: 'ჰიდ. ზეთის დონე — ნორმაშია მაჩვენებლის მიხედვით' },
  { id: 13, category: 'B', label: 'ჰიდრავლ.', description: 'ამომწევი/ჩამომწევი ფუნქცია — გლუვი, ჭახჭახი/ვიბრირება' },
  { id: 14, category: 'B', label: 'ჰიდრავლ.', description: 'ციცხვის დახრის ფუნქცია — ნორმაში' },
  // C — old #14-19 → #15-20
  { id: 15, category: 'C', label: 'ძრავი',     description: 'ძრავის ზეთის დონე — ზეთმზომი ნორმის ფარგლებში' },
  { id: 16, category: 'C', label: 'ძრავი',     description: 'გამაგრილებელი სითხე — საჰაერო სარეზერვუარო ნორმაშია' },
  { id: 17, category: 'C', label: 'ძრავი',     description: 'ძრავის გარეგნული ნაჟური — ზეთი, სითხე იღვრება' },
  { id: 18, category: 'C', label: 'ძრავი',     description: 'ჰაერის ფილტრის ინდიკატორი — წითელი სიგნალი არ ანათებს' },
  { id: 19, category: 'C', label: 'ძრავი',     description: 'ამომშვები მილი (exhaust) — შავი კვამლი, ნაჟური არ ჩანს' },
  { id: 20, category: 'C', label: 'ძრავი',     description: 'საწვავის სისტემა ბაკი — ნაჟური, ბზარი' },
  // D — old #20-30 → #21-31, with description replacements at #28, #30, #31
  { id: 21, category: 'D', label: 'კაბინა',    description: 'კარები — ნორმაშია' },
  { id: 22, category: 'D', label: 'კაბინა',    description: 'მინები — სუფთა, ბზარი, დაზიანება ჩანს' },
  { id: 23, category: 'D', label: 'კაბინა',    description: 'სავარძელი — მაგარია, ფუნქციონარი მუშაობს' },
  { id: 24, category: 'D', label: 'მართვა',    description: 'ბერკეტები/ჯოისტიკი/მართვის პანელი' },
  { id: 25, category: 'D', label: 'მართვა',    description: 'ყველა გამშვები/ინდიკატორი — მუშაობს, გაფრთხილება არ ჩანს' },
  { id: 26, category: 'D', label: 'მართვა',    description: 'სიგნალი/ჰორნი — მუშაობს' },
  { id: 27, category: 'D', label: 'განათება',  description: 'ყველა შუქი: წინა/უკანა, ციმციმა — მუშაობს' },
  // #28: replaces bobcat's "სარკეები" with door-seal check
  { id: 28, category: 'D', label: 'კარები',    description: 'კარები, სარეზინები — ნორმ. იხსნება, ჰაეროვანია' },
  { id: 29, category: 'D', label: 'უსაფრ.',    description: 'ტვირთის მაჩვენებელი ფირფიტა (load plate) — ხილვადია' },
  // #30: replaces bobcat's "ქამარი" with combined seat+belt check
  { id: 30, category: 'D', label: 'კაბინა',    description: 'სავარძელი — მაგარია, სარტყელი ფუნქციონარი მუშაობს' },
  // #31: replaces bobcat's "ასასვლელი კიბე" with joystick return-to-centre check
  { id: 31, category: 'D', label: 'მართვა',    description: 'ბერკეტები/ჯოისტიკი (joystick/lever) — ნორმ. ბრუნდება, ჩარჩება არ ჩანს' },
  // #32: new — steering wheel
  { id: 32, category: 'D', label: 'მართვა',    description: 'საჭე — ლაფსუსი ≤ 15°, ბრუნვა გლუვია' },
  // #40: new — reverse camera; "not present" is neutral (does not trigger rejected verdict)
  { id: 40, category: 'D', label: 'უსაფრ.',    description: 'უკუსვლის ვიდეო თვალი', unusableLabel: 'არ გააჩნია', unusableIsNeutral: true },
];

export const BOBCAT_CATEGORY_LABELS: Record<BobcatCategory, string> = {
  A: 'A — თვლები და სამუხრუჭე სისტემა',
  B: 'B — ციცხვი, მკლავი, ჰიდრავლ.',
  C: 'C — ძრავი',
  D: 'D — კაბინა, მართვა, უსაფრ.',
};

export const INSPECTION_TYPE_LABEL: Record<BobcatInspectionType, string> = {
  pre_work:  'სამუშაობამდე',
  scheduled: 'გეგმური',
  other:     'სხვა',
};

export const VERDICT_LABEL: Record<BobcatVerdict, string> = {
  approved: 'დაშვებულია სამუშაოდ — ყველა პუნქტი ნორმაშია',
  limited:  'დაშვებულია შეზღუდულად — ხარვეზების მოსაგვარებლად',
  rejected: 'არ დაიშვება სამუშაოდ — გადაცემა ტექ. მომსახურებაში',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build the default (all-null) items state for a given catalog. */
export function buildDefaultItems(catalog?: BobcatChecklistEntry[]): BobcatItemState[] {
  return (catalog ?? BOBCAT_ITEMS).map(item => ({
    id: item.id,
    result: null,
    comment: null,
    photo_paths: [],
  }));
}

/**
 * Suggest a verdict based on filled item results.
 * Pass the relevant catalog so neutral unusable items (unusableIsNeutral)
 * are excluded from the rejection/approval logic.
 */
export function computeVerdictSuggestion(
  items: BobcatItemState[],
  catalog?: BobcatChecklistEntry[],
): BobcatVerdict | null {
  const cat = catalog ?? BOBCAT_ITEMS;
  const filled = items.filter(i => i.result !== null);
  if (filled.length === 0) return null;

  const isNeutral = (id: number) =>
    cat.find(e => e.id === id)?.unusableIsNeutral === true;

  if (filled.some(i => i.result === 'unusable' && !isNeutral(i.id))) return 'rejected';
  if (filled.some(i => i.result === 'deficient')) return 'limited';
  if (filled.every(i => i.result === 'good' || (i.result === 'unusable' && isNeutral(i.id)))) return 'approved';
  return null;
}

export interface CategoryCounts {
  good: number;
  deficient: number;
  unusable: number;
}

/**
 * Count item results per category.
 * Pass the relevant catalog so category membership is looked up correctly.
 */
export function categoryCounts(
  items: BobcatItemState[],
  cat: BobcatCategory,
  catalog?: BobcatChecklistEntry[],
): CategoryCounts {
  const entries = catalog ?? BOBCAT_ITEMS;
  const catItems = items.filter(
    i => entries.find(e => e.id === i.id)?.category === cat,
  );
  return {
    good:      catItems.filter(i => i.result === 'good').length,
    deficient: catItems.filter(i => i.result === 'deficient').length,
    unusable:  catItems.filter(i => i.result === 'unusable').length,
  };
}
