// Excavator technical inspection — ექსკავატორის ტექნიკური შემოწმების აქტი
//
// Separate from the bobcat/large-loader template family: different sections,
// a mixed checklist (3-state + yes/no/date), extended signature block, and
// machine specs stored on the template definition rather than the form.

export type Section = 'engine' | 'undercarriage' | 'cabin' | 'safety';
export type ExcavatorVerdict = 'approved' | 'conditional' | 'rejected';
export type ExcavatorChecklistResult = 'good' | 'deficient' | 'unusable' | null;

// ── Template constants ────────────────────────────────────────────────────────

export const EXCAVATOR_TEMPLATE_ID = '55555555-5555-5555-5555-555555555555';

export interface ExcavatorMachineSpecs {
  weight: string;
  engine: string;
  power: string;
  depth: string;
  travel: string;
  maxReach: string;
}

export const EXCAVATOR_MACHINE_SPECS: ExcavatorMachineSpecs = {
  weight: '22,400 kg',
  engine: 'Volvo D6E',
  power: '129 kW / 2,000 rpm',
  depth: '6,710 mm',
  travel: '6,540 mm',
  maxReach: '29,500 kg',
};

// ── Checklist entries (3-state) ───────────────────────────────────────────────

export interface ExcavatorChecklistEntry {
  id: number;
  label: string;
  description: string;
  /** Extra help text shown in the bottom sheet when user taps "?" */
  helpText?: string;
}

export const ENGINE_ITEMS: ExcavatorChecklistEntry[] = [
  { id: 1, label: 'ძრავის ზეთი',   description: 'ძრავის ზეთის დონე — ნორმაზე დაბალი თუ არის პრობლემაა' },
  { id: 2, label: 'გამაგრილებელი', description: 'გამაგრილებლის სითხის დონე და კონცენტრაცია' },
  { id: 3, label: 'ჰიდრ. ზეთი',   description: 'ჰიდრავლიკური ზეთის დონე' },
  { id: 4, label: 'საწვავი',        description: 'საწვავის სისტემა — გაჟონვა, თუ არის (პრობლემაა)' },
  { id: 5, label: 'საჰ. ფილტრი',  description: 'საჰაერო ფილტრი — გაბიდნული/დაზიანებული თუ არის (პრობლემაა)' },
  { id: 6, label: 'ვიზუალი',       description: 'ძრავის ვიზუალური დათვალიერება — გაჟონვა, ხმაური, ვიბრაცია' },
  { id: 7, label: 'გამონაბოლქვი', description: 'აირები / გამონაბოლქვი — ფერი (შავი/ლურჯი = პრობლემა)' },
  { id: 8, label: 'ბუქსირი',       description: 'ბუქსირის მდგომარეობა — დაზიანებული თუ არის (პრობლემაა)' },
];

export const UNDERCARRIAGE_ITEMS: ExcavatorChecklistEntry[] = [
  { id: 1,  label: 'ჯაჭვი',           description: 'მუხლუხოს ჯაჭვის დაჭიმულობა — სამაგრები მოშვებული/დაზიანებული' },
  { id: 2,  label: 'Idler Wheel',      description: 'წინა მიმმართველი გლუვი რგოლი (Idler Wheel) — ბზარი, ზეთის გაჟონვა' },
  { id: 3,  label: 'Drive Sprocket',   description: 'დაკბილული წამყვანი რგოლი (Drive Sprocket) — ბზარი, ზეთის გაჟონვა' },
  { id: 4,  label: 'ჰიდრო შლანგები', description: 'ჰიდრავლიკის შლანგების დაერთება — გაჟონვა ზეთების' },
  { id: 5,  label: 'შროკი',            description: 'შროკი — ბზარები, კოროზია, დაბრეცილი, სამგრი ბოლტები მოშვებული' },
  { id: 6,  label: 'Track Frame',      description: 'ჩარჩო (Track Frame) — სახსრები, ბოლტები, ვიზუალი' },
  { id: 7,  label: 'მთ. ჰიდრო ც.',   description: 'მთავარი ჰიდრო ცილინდრი — ზეთის გაჟონვა / კორპუსის მთლიანობა' },
  { id: 8,  label: 'დამხ. ჰიდრო ც.', description: 'დამხმარე ჰიდრო ცილინდრი — ზეთის გაჟონვა / კორპუსის მთლიანობა' },
  { id: 9,  label: 'ციცხვის ც.',      description: 'ციცხვის ჰიდრო ცილინდრი — ზეთის გაჟონვა / კორპუსის მთლიანობა' },
  { id: 10, label: 'Boom/Stick',       description: 'ძირითადი და შუა ისარი/მკლავი (Boom Arm/Stick) — ბოლტების მოშვება, ბზარები' },
  { id: 11, label: 'ციცხვი',           description: 'ციცხვი (Bucket) — კბილები, ფირფიტები დაზიანებული, ნახვრეტები' },
];

export const CABIN_ITEMS: ExcavatorChecklistEntry[] = [
  { id: 1, label: 'Monitor',      description: 'სმარტის პანელი (Monitor) — ჩვენება, სიგნალები, შეცდომის კოდები' },
  { id: 2, label: 'სამ. რეჟიმები', description: 'სამუშაო რეჟიმები (ECO/Standard/Power) — გადართვა' },
  { id: 3, label: 'პედლები',      description: 'პედლები — ოპერაციული მგრძნობელობა' },
  { id: 4, label: 'ჯოისტიკი',    description: 'ჯოისტიკი / მართვის ბერკეტი — ფუნქციების სწორი შესრულება' },
  { id: 5, label: 'სავარძელი',   description: 'ოპერატორის სავარძელი — ფუნქციონარი' },
  { id: 6, label: 'HVAC',         description: 'გათბობა / კონდიციონერი — მუშა მდგომარეობა' },
  { id: 7, label: 'სარკეები',    description: 'სარკეები — სისუფთავე, სწორი კუთხე' },
  { id: 8, label: 'კარი',         description: 'კარი, სახელური, ჩაკეტვა — მდგომარეობა' },
];

export const SAFETY_ITEMS: ExcavatorChecklistEntry[] = [
  { id: 1, label: 'სამ. განათება', description: 'სამუშაო განათება (წინა/უკანა) — ყველა ნათურა ნათებადი' },
  { id: 2, label: 'Beacon Light',  description: 'სასიგნალო შუქი (Beacon Light) — ბრუნვა, სიკაშკაშე, ხმა' },
  { id: 3, label: 'კამერა',        description: 'უკანა ხედვის კამერა (Rear View Camera) — სურათი, სიმკვეთრე' },
  { id: 4, label: 'ROPS/FOPS',     description: 'ROPS/FOPS სტრუქტურა — ბოლტები, ბზარები, დაზიანება' },
  { id: 5, label: 'ხანძარსაქ.',   description: 'სახანძრო მოწყობილობა — ვადა, ადგილმდებარეობა, ვიზირი' },
  { id: 6, label: 'სტიკერები',    description: 'გაფრთხილების სტიკერები — წაკითხვადობა' },
  { id: 7, label: 'გამოსასვლ.',   description: 'საავარიო გამოსასვლელი — ხელმისაწვდომობა' },
];

// ── Maintenance entries (yes/no/date) ─────────────────────────────────────────

export interface ExcavatorMaintenanceEntry {
  id: number;
  label: string;
}

export const MAINTENANCE_ITEMS: ExcavatorMaintenanceEntry[] = [
  { id: 1, label: 'ტექ. ინსპექტირების ბოლო პერიოდი ცნობილია?' },
  { id: 2, label: 'ძრავის ზეთის შეცვლის მომდევნო ვადა ცნობილია?' },
  { id: 3, label: 'ჰიდრავლიკის ზეთის, ჰაერის ფილტრის შეცვლის მომდევნო ვადა ცნობილია?' },
];

// ── Item state types ──────────────────────────────────────────────────────────

export interface ExcavatorChecklistItemState {
  id: number;
  result: ExcavatorChecklistResult;
  comment: string | null;
  photo_paths: string[];
}

export interface ExcavatorMaintenanceItemState {
  id: number;
  answer: 'yes' | 'no' | null;
  date: string | null; // ISO date "YYYY-MM-DD"
}

// ── Inspection model ──────────────────────────────────────────────────────────

export interface ExcavatorInspection {
  id: string;
  projectId: string;
  templateId: string;
  userId: string;
  status: 'draft' | 'completed';

  // Machine specs (snapshot from template at creation time)
  machineSpecs: ExcavatorMachineSpecs;

  // Section II — Document info
  serialNumber: string | null;
  inventoryNumber: string | null;
  projectName: string | null;   // ობიექტი / პროექტი — auto-filled from project
  department: string | null;
  inspectionDate: string;       // ISO date "YYYY-MM-DD"
  motoHours: number | null;
  inspectorName: string | null;
  lastInspectionDate: string | null;

  // Section III — Checklist (3-state)
  engineItems: ExcavatorChecklistItemState[];       // 8
  undercarriageItems: ExcavatorChecklistItemState[]; // 11
  cabinItems: ExcavatorChecklistItemState[];         // 8
  safetyItems: ExcavatorChecklistItemState[];        // 7

  // Section VI — Maintenance (yes/no/date)
  maintenanceItems: ExcavatorMaintenanceItemState[]; // 3

  // Section IV — Verdict
  verdict: ExcavatorVerdict | null;
  notes: string | null;

  // Section V — Inspector
  inspectorPosition: string | null;
  inspectorSignature: string | null;
  summaryPhotos?: string[];

  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Verdict labels ────────────────────────────────────────────────────────────

export const EXCAVATOR_VERDICT_LABEL: Record<ExcavatorVerdict, string> = {
  approved:    'გამართულია — სამუშაოდ დაიშვება',
  conditional: 'პირობითად — შეზღუდვებით, სერვისი დასაგეგმია',
  rejected:    'გაუმართავია — სამუშაოდ არ დაიშვება',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultChecklistItems(entries: ExcavatorChecklistEntry[]): ExcavatorChecklistItemState[] {
  return entries.map(e => ({ id: e.id, result: null, comment: null, photo_paths: [] }));
}

function defaultMaintenanceItems(): ExcavatorMaintenanceItemState[] {
  return MAINTENANCE_ITEMS.map(e => ({ id: e.id, answer: null, date: null }));
}

export function buildDefaultExcavatorItems(): {
  engineItems: ExcavatorChecklistItemState[];
  undercarriageItems: ExcavatorChecklistItemState[];
  cabinItems: ExcavatorChecklistItemState[];
  safetyItems: ExcavatorChecklistItemState[];
  maintenanceItems: ExcavatorMaintenanceItemState[];
} {
  return {
    engineItems:        defaultChecklistItems(ENGINE_ITEMS),
    undercarriageItems: defaultChecklistItems(UNDERCARRIAGE_ITEMS),
    cabinItems:         defaultChecklistItems(CABIN_ITEMS),
    safetyItems:        defaultChecklistItems(SAFETY_ITEMS),
    maintenanceItems:   defaultMaintenanceItems(),
  };
}

export function computeExcavatorVerdictSuggestion(
  insp: Pick<ExcavatorInspection, 'engineItems' | 'undercarriageItems' | 'cabinItems' | 'safetyItems'>,
): ExcavatorVerdict | null {
  const all = [
    ...insp.engineItems,
    ...insp.undercarriageItems,
    ...insp.cabinItems,
    ...insp.safetyItems,
  ];
  const filled = all.filter(i => i.result !== null);
  if (filled.length === 0) return null;
  if (filled.some(i => i.result === 'unusable')) return 'rejected';
  if (filled.some(i => i.result === 'deficient')) return 'conditional';
  if (all.every(i => i.result === 'good')) return 'approved';
  return null;
}
