// Cargo receiving platform inspection (ტვირთის მიმღები პლატფორმის შემოწმების აქტი).
// DB-backed by `cargo_platform_inspections` table (migration 0040).
//
// Result set: 'good' | 'fix' | 'na'  (different from other templates)
//   good → all OK
//   fix  → fixable deficiency; opens accordion for comment + photos
//   na   → not applicable; no accordion
//
// Two signatories (both must sign before completion).

export type CPResult   = 'good' | 'fix' | 'na';
export type CPVerdict  = 'approved' | 'conditional' | 'rejected';
export type CPSection  = 'A' | 'B';

export const CARGO_PLATFORM_TEMPLATE_ID = '77777777-7777-7777-7777-777777777777';

export interface CPItemState {
  id: number;
  result: CPResult | null;
  comment: string | null;
  /** Storage paths in `answer-photos` bucket: cargo-platform/{inspectionId}/{itemId}/{uuid}.jpg */
  photo_paths: string[];
}

export interface CPCargoRow {
  id: string;
  name: string;
  unit_weight_kg: number | null;
  total_weight_kg: number | null;
  note: string;
}

export interface CPSignatory {
  name: string;
  position: string;
  organization: string;
  /** Base64 PNG without the data: prefix. */
  signature: string | null;
  date: string | null;
}

export interface CargoPlatformInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  // Section 1 — ზოგადი ინფორმაცია
  company: string;
  address: string;
  inspectorName: string;
  floorZone: string;
  inspectionDate: string; // ISO date e.g. "2025-05-13"
  // Section 2 — პლატფორმის იდენტიფიკაცია
  platformTypeModel: string;
  platformLength: number | null;
  platformWidth: number | null;
  platformColorDesc: string;
  sideGuardrail: 'none' | 'complete' | null;
  frontGuardrail: 'none' | 'complete' | null;
  guardrailHeight: 'non_standard' | 'standard' | null;
  // Section 3 — ტვირთის იდენტიფიკაცია
  cargo: CPCargoRow[];
  // Section 4 — პლატფორმის შემოწმება
  items: CPItemState[];
  // Section 5 — დასკვნა
  verdict: CPVerdict | null;
  verdictComment: string;
  // Section 6 — ფოტო / ვიდეო მასალა
  summaryPhotos: string[];
  // Section 7 — ხელმოწერები
  signatures: CPSignatory[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Checklist catalog ─────────────────────────────────────────────────────────

export interface CPChecklistEntry {
  id: number;
  section: CPSection;
  label: string;
  description: string;
}

// 9 items: Section A (1-4), Section B (5-9)
export const CP_ITEMS: CPChecklistEntry[] = [
  // Section A — სტრუქტურული მთლიანობა
  {
    id: 1, section: 'A',
    label: 'ძირის ფილები',
    description: 'პლატფორმის ძირის (ფილების) მდგომარეობა — ბზარები, დეფორმაცია, კოროზია თუ არის — ცუდია',
  },
  {
    id: 2, section: 'A',
    label: 'მზიდი ჩარჩო',
    description: 'მზიდი ჩარჩოს (ლითონის) მდგომარეობა — ბზარი, გახსნილი, დეფორმირებული — ცუდია',
  },
  {
    id: 3, section: 'A',
    label: 'სვეტები',
    description: 'სვეტების (ვერტიკალური დგარების) მდგომარეობა — დეფორმირებული, გამოძრავდა, მოშვებული — ცუდია',
  },
  {
    id: 4, section: 'A',
    label: 'ანკერული გამაგრება',
    description: 'ანკერული გამაგრებების მდგომარეობა — სიმჭიდროვე დარღვეულია, კოროზიულია — ცუდია',
  },
  // Section B — მოაჯირები
  {
    id: 5, section: 'B',
    label: 'გვ. მოაჯირის სიმ.',
    description: 'გვერდითი მოაჯირების სიმაღლე (მინ. 90–120 სმ)',
  },
  {
    id: 6, section: 'B',
    label: 'მოაჯირის სიმტკ.',
    description: 'მოაჯირების სტრუქტურული სიმტკიცე — აკლია, ბზარი — ცუდია',
  },
  {
    id: 7, section: 'B',
    label: 'წინა მოაჯირი',
    description: 'წინა მოძრავი (დასაკეცი) მოაჯირების ფუნქციონირება — გახსნა/დაკეტვა — თუ არ ფუნქციონირებს ცუდია',
  },
  {
    id: 8, section: 'B',
    label: 'ჩამკეტი მოწყ.',
    description: 'მოძრავი მოაჯირის ჩამკეტი მოწყობილობა — არ გააჩნია, არ იკეტება — ცუდია',
  },
  {
    id: 9, section: 'B',
    label: 'კავშირები',
    description: 'მოაჯირის ყველა კავშირი (სახსრები) — ბზარი, დაზიანებული — ცუდია',
  },
];

export const CP_SECTION_LABELS: Record<CPSection, string> = {
  A: 'A — სტრუქტურული მთლიანობა',
  B: 'B — მოაჯირები',
};

export const CP_VERDICT_LABEL: Record<CPVerdict, string> = {
  approved:    'პლატფორმა შეესაბამება მოთხოვნებს და დაშვებულია ექსპლუატაციაში',
  conditional: 'პლატფორმა პირობით დაშვებულია — საჭიროა ქვემოთ მითითებული ღონისძიებების შესრულება',
  rejected:    'პლატფორმა არ შეესაბამება მოთხოვნებს — ექსპლუატაცია შეჩერებულია',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEmptySignatory(): CPSignatory {
  return { name: '', position: '', organization: '', signature: null, date: null };
}

export function buildDefaultCPItems(): CPItemState[] {
  return CP_ITEMS.map(e => ({ id: e.id, result: null, comment: null, photo_paths: [] }));
}

export function buildDefaultCargoRow(): CPCargoRow {
  return {
    id: Math.random().toString(36).slice(2),
    name: '',
    unit_weight_kg: null,
    total_weight_kg: null,
    note: '',
  };
}

export function buildDefaultCPInspection(
  id: string,
  projectId: string,
  userId: string,
  templateId: string | null,
  now: string,
): CargoPlatformInspection {
  return {
    id,
    projectId,
    templateId,
    userId,
    status: 'draft',
    company: '',
    address: '',
    inspectorName: '',
    floorZone: '',
    inspectionDate: now.slice(0, 10),
    platformTypeModel: '',
    platformLength: null,
    platformWidth: null,
    platformColorDesc: '',
    sideGuardrail: null,
    frontGuardrail: null,
    guardrailHeight: null,
    cargo: [buildDefaultCargoRow(), buildDefaultCargoRow(), buildDefaultCargoRow()],
    items: buildDefaultCPItems(),
    verdict: null,
    verdictComment: '',
    summaryPhotos: [],
    signatures: [buildEmptySignatory()],
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Suggest verdict from filled item results.
 *  All non-null results are good or na → approved
 *  Any fix → conditional
 *  Returns null if nothing is filled.
 */
export function computeCPVerdictSuggestion(items: CPItemState[]): CPVerdict | null {
  const filled = items.filter(i => i.result !== null);
  if (filled.length === 0) return null;
  if (filled.some(i => i.result === 'fix')) return 'conditional';
  if (filled.every(i => i.result === 'good' || i.result === 'na')) return 'approved';
  return null;
}

export function cpTotalWeight(cargo: CPCargoRow[]): number {
  return cargo.reduce((sum, r) => sum + (r.total_weight_kg ?? 0), 0);
}
