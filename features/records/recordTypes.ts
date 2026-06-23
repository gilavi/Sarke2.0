// Single source of truth for the five "record types" surfaced globally
// (cross-project) on the History screen, the Home widgets, and the Drafts
// screen. Order here drives the History chip order and the Home widget order:
// Inspections is the default/first, then Reports, Brdzaneba (orders),
// Incidents, Briefings — matching the project-detail section order.

import {
  ShieldCheck,
  FileText,
  Award,
  TriangleAlert,
  Megaphone,
  type LucideIcon,
} from 'lucide-react-native';

export type RecordTypeKey =
  | 'inspections'
  | 'reports'
  | 'orders'
  | 'incidents'
  | 'briefings';

export interface RecordTypeDescriptor {
  key: RecordTypeKey;
  /** i18n key for the plural section/widget title (e.g. "შემოწმების აქტები"). */
  labelKey: string;
  /** i18n key for the per-type empty-state copy. */
  emptyKey: string;
  icon: LucideIcon;
}

export const RECORD_TYPES: RecordTypeDescriptor[] = [
  { key: 'inspections', labelKey: 'records.inspections', emptyKey: 'records.emptyInspections', icon: ShieldCheck },
  { key: 'reports',     labelKey: 'records.reports',     emptyKey: 'records.emptyReports',     icon: FileText },
  { key: 'orders',      labelKey: 'records.orders',      emptyKey: 'records.emptyOrders',      icon: Award },
  { key: 'incidents',   labelKey: 'records.incidents',   emptyKey: 'records.emptyIncidents',   icon: TriangleAlert },
  { key: 'briefings',   labelKey: 'records.briefings',   emptyKey: 'records.emptyBriefings',   icon: Megaphone },
];

export const RECORD_TYPE_KEYS = RECORD_TYPES.map((r) => r.key);

/**
 * Row cap for the cross-project "completed records" feed. Deliberately shared
 * by the Home widgets (which slice the first 4) and the History per-type lists
 * (which show them all) so the two hit the SAME React Query cache entry — Home
 * pre-warms History and switching is instant. Widget counts are accurate up to
 * this cap; paginate later if a single type ever exceeds it.
 */
export const RECENT_COMPLETED_LIMIT = 50;

/** The default/landing type for the History screen. */
export const DEFAULT_RECORD_TYPE: RecordTypeKey = 'inspections';

export function isRecordTypeKey(value: string | null | undefined): value is RecordTypeKey {
  return !!value && (RECORD_TYPE_KEYS as string[]).includes(value);
}

export function recordTypeOf(key: RecordTypeKey): RecordTypeDescriptor {
  return RECORD_TYPES.find((r) => r.key === key) ?? RECORD_TYPES[0];
}

/** Deep-link to the History screen filtered to one type. */
export function historyHref(key: RecordTypeKey): string {
  return `/history?type=${key}`;
}
