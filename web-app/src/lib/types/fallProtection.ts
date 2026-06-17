// Fall-protection (anchor / lifeline) inspection types -
// დამჭერი მოწყობილობების შემოწმების აქტი. DB-backed by
// `fall_protection_inspections` (migration 0046).
//
// Web mirror of the Expo app's `types/fallProtection.ts`, but FLATTENED to a
// SINGLE device for the unified web wizard: the mobile app supports a variable
// number of devices (registry table) each with its own checklist + verdict; the
// web layer persists one device (id "N1") in the `device_data[0]` slot so rows
// still round-trip structurally. The single top-level signature is never
// persisted (regulatory).

export const FALL_PROTECTION_TEMPLATE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

export type FPResult = 'safe' | 'critical' | 'minor' | 'na';
export type FPVerdict = 'safe' | 'minor' | 'banned';

export interface FPItemState {
  id: number;
  result: FPResult | null;
  comment: string | null;
  photo_paths: string[];
}

export interface FallProtectionInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  company: string;
  address: string;
  inspectionDate: string;
  safetyLeaderName: string;
  safetyLeaderPhone: string;
  deviceType: string;
  deviceLocation: string;
  items: FPItemState[];
  verdict: FPVerdict | null;
  verdictComment: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FPChecklistEntry {
  id: number;
  label: string;
}

export const FP_CHECKLIST_ITEMS: FPChecklistEntry[] = [
  { id: 1, label: 'კონსტრუქციაზე ანკერის ჩამაგრება, გამძლეობა' },
  { id: 2, label: 'ანკერის კორპუსის მთლიანობა' },
  { id: 3, label: 'ლითონის მომჭერების მთლიანობა' },
  { id: 4, label: 'უსაფრთ. ლითონის ბაგირის მდგომარეობა' },
  { id: 5, label: 'ლითონის ბაგირის კავშირების/კვანძების მდგ.' },
  { id: 6, label: 'უსაფრთხოების ბაგირის მდგომარეობა' },
  { id: 7, label: 'ბაგირის დაერთების/კვანძების მდგომარეობა' },
  { id: 8, label: 'კონსტრუქცია - მიმაგრების სიმტკიცე' },
  { id: 9, label: 'კოუშების მდგომარეობა' },
  { id: 10, label: 'ვარდნის შემაკავებელი სისტემის მდგ.' },
  { id: 11, label: 'კავების/ჩამკეტიანი კავების მდგომარეობა' },
  { id: 12, label: 'დამაკავშირებელი კარაბინების მდგომარეობა' },
];

export const FP_RESULT_TO_CHIP: Record<FPResult, string> = {
  safe: 'უსაფრთხოა',
  critical: 'კრიტიკული',
  minor: 'მცირე',
  na: 'არ ეხება',
};

export const FP_VERDICT_LABELS: Record<FPVerdict, string> = {
  safe: 'უსაფრთხოა - გამოყენება დაშვებულია',
  minor: 'მცირე დაზიანება - საჭიროა დაკვირვება',
  banned: 'დაზიანებულია - აკრძალულია გამოყენება',
};

export function buildDefaultFPItems(): FPItemState[] {
  return FP_CHECKLIST_ITEMS.map((e) => ({ id: e.id, result: null, comment: null, photo_paths: [] }));
}
