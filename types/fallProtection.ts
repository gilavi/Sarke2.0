export const FALL_PROTECTION_TEMPLATE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

export type FPResult       = 'safe' | 'critical' | 'minor' | 'na';
export type FPVerdict      = 'safe' | 'minor' | 'banned';
export type FPInspectionType = 'primary' | 'secondary';

/** One row in the equipment registry table. */
export interface FPDeviceRow {
  id: string;       // display ID: "N1", "N2", …
  type: string;     // ტიპი/სახეობა
  location: string; // განთავს. ადგილი
  floor: string;    // სართული
  purpose: string;  // ვისთვის/რისთვის
  comment: string;
}

export interface FPItemState {
  id: number;
  result: FPResult | null;
  comment: string | null;
  photo_paths: string[];
}

/** The 13th (custom) checklist item with an editable label. */
export interface FPCustomItem {
  label: string;
  result: FPResult | null;
  comment: string | null;
  photo_paths: string[];
}

export interface FPSignatory {
  name: string;
  position: string;
  signature: string | null;
  date: string | null;
}

/** All inspection data for a single device. */
export interface FPDeviceData {
  deviceId: string;       // "N1", "N2", …
  items: FPItemState[];   // 12 standard items
  customItem: FPCustomItem;
  verdict: FPVerdict | null;
  verdictComment: string;
  photoPaths: string[];
}

export interface FallProtectionInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';

  // General info
  company: string;
  address: string;
  inspectionDate: string;
  safetyLeaderName: string;
  safetyLeaderPhone: string;
  inspectionType: FPInspectionType | null;
  nextInspectionDate: string | null;

  // Equipment registry
  devices: FPDeviceRow[];

  // Per-device inspection data (parallel array to devices)
  deviceData: FPDeviceData[];

  // Single top-level signature (ephemeral - not persisted to DB)
  signature: FPSignatory;

  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Checklist catalog ─────────────────────────────────────────────────────────

export interface FPChecklistEntry {
  id: number;
  label: string;
}

export const FP_CHECKLIST_ITEMS: FPChecklistEntry[] = [
  { id: 1,  label: 'კონსტრუქციაზე ანკერის ჩამაგრება, გამძლეობა' },
  { id: 2,  label: 'ანკერის კორპუსის მთლიანობა' },
  { id: 3,  label: 'ლითონის მომჭერების მთლიანობა' },
  { id: 4,  label: 'უსაფრთ. ლითონის ბაგირის მდგომარეობა' },
  { id: 5,  label: 'ლითონის ბაგირის კავშირების/კვანძების მდგ.' },
  { id: 6,  label: 'უსაფრთხოების ბაგირის მდგომარეობა' },
  { id: 7,  label: 'ბაგირის დაერთების/კვანძების მდგომარეობა' },
  { id: 8,  label: 'კონსტრუქცია - მიმაგრების სიმტკიცე' },
  { id: 9,  label: 'კოუშების მდგომარეობა' },
  { id: 10, label: 'ვარდნის შემაკავებელი სისტემის მდგ.' },
  { id: 11, label: 'კავების/ჩამკეტიანი კავების მდგომარეობა' },
  { id: 12, label: 'დამაკავშირებელი კარაბინების მდგომარეობა' },
];

/** 4-state checklist options for fall-protection items. */
export const FP_CHECKLIST_OPTIONS = {
  a: '✓',
  b: '✗',
  c: 'Z',
  d: 'N',
} as const;

export const FP_RESULT_TO_CHIP: Record<FPResult, string> = {
  safe:     '✓',
  critical: '✗',
  minor:    'Z',
  na:       'N',
};

export const FP_CHIP_TO_RESULT: Record<string, FPResult> = {
  '✓': 'safe',
  '✗': 'critical',
  'Z': 'minor',
  'N': 'na',
};

export const FP_VERDICT_LABELS: Record<FPVerdict, string> = {
  safe:   'უსაფრთხოა - გამოყენება დაშვებულია',
  minor:  'მცირე დაზიანება - საჭიროა დაკვირვება',
  banned: 'დაზიანებულია - აკრძალულია გამოყენება',
};

/** Tab display state for a device. */
export type FPTabState = 'pending' | 'active' | 'warning' | 'problem' | 'done';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildDefaultFPItems(): FPItemState[] {
  return FP_CHECKLIST_ITEMS.map(e => ({
    id: e.id,
    result: null,
    comment: null,
    photo_paths: [],
  }));
}

export function buildDefaultFPCustomItem(): FPCustomItem {
  return { label: 'სხვა', result: null, comment: null, photo_paths: [] };
}

export function buildDefaultFPSignatory(): FPSignatory {
  return { name: '', position: '', signature: null, date: null };
}

export function buildDefaultFPDeviceData(deviceId: string): FPDeviceData {
  return {
    deviceId,
    items: buildDefaultFPItems(),
    customItem: buildDefaultFPCustomItem(),
    verdict: null,
    verdictComment: '',
    photoPaths: [],
  };
}

export function buildDefaultFPDeviceRow(idx: number): FPDeviceRow {
  return { id: `N${idx + 1}`, type: '', location: '', floor: '', purpose: '', comment: '' };
}

export function buildDefaultFallProtectionInspection(
  id: string,
  projectId: string,
  userId: string,
  templateId: string | null,
  now: string,
): FallProtectionInspection {
  const defaultDevices = [0, 1, 2].map(i => buildDefaultFPDeviceRow(i));
  return {
    id,
    projectId,
    templateId,
    userId,
    status: 'draft',
    company: '',
    address: '',
    inspectionDate: now.slice(0, 10),
    safetyLeaderName: '',
    safetyLeaderPhone: '',
    inspectionType: null,
    nextInspectionDate: null,
    devices: defaultDevices,
    deviceData: defaultDevices.map(d => buildDefaultFPDeviceData(d.id)),
    signature: buildDefaultFPSignatory(),
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Keeps deviceData in sync with devices array.
 * Preserves existing data for rows that still exist; adds defaults for new rows.
 */
export function syncDeviceData(
  newDevices: FPDeviceRow[],
  oldDeviceData: FPDeviceData[],
): FPDeviceData[] {
  return newDevices.map((d, i) => {
    const existing = oldDeviceData[i];
    if (existing) return { ...existing, deviceId: d.id };
    return buildDefaultFPDeviceData(d.id);
  });
}

/** Recomputes device IDs to stay sequential (N1, N2, …) after row deletion. */
export function renumberDevices(devices: FPDeviceRow[]): FPDeviceRow[] {
  return devices.map((d, i) => ({ ...d, id: `N${i + 1}` }));
}

export function computeFPTabState(data: FPDeviceData): FPTabState {
  const hasAnyAnswer =
    data.items.some(i => i.result !== null) || data.customItem.result !== null;

  if (!hasAnyAnswer && !data.verdict) return 'pending';
  if (data.verdict) return 'done';

  const hasCritical =
    data.items.some(i => i.result === 'critical') ||
    data.customItem.result === 'critical' ||
    data.verdict === 'banned';
  if (hasCritical) return 'problem';

  const hasMinor =
    data.items.some(i => i.result === 'minor') ||
    data.customItem.result === 'minor' ||
    data.verdict === 'minor';
  if (hasMinor) return 'warning';

  return 'active';
}

export function computeFPVerdictSuggestion(data: FPDeviceData): FPVerdict | null {
  const results = [
    ...data.items.map(i => i.result),
    data.customItem.result,
  ].filter((r): r is FPResult => r !== null);

  if (results.length === 0) return null;
  if (results.some(r => r === 'critical')) return 'banned';
  if (results.some(r => r === 'minor')) return 'minor';
  return 'safe';
}
