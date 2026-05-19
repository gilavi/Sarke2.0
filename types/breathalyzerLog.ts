export type BLResultStatus = 'safe' | 'warning' | 'fail';
export type BLTestType = 'primary' | 'repeat';
export type BLStatus = 'open' | 'closed';

export interface BLEntry {
  id: string;
  order: number;
  personName: string;
  position: string;
  testType: BLTestType;
  result: number;          // e.g. 0.05
  resultStatus: BLResultStatus;
  signature: string | null; // base64 PNG, no data: prefix
  refusedSignature: boolean;
  time: string;            // ISO string
  relatedEntryId: string | null;
}

export interface BLResponsiblePerson {
  name: string;
  signature: string | null;
}

export interface BreathalizerLog {
  id: string;
  projectId: string;
  date: string;            // YYYY-MM-DD
  deviceSerialNumber: string | null;
  entries: BLEntry[];
  responsiblePerson: BLResponsiblePerson;
  status: BLStatus;
  createdAt: string;
  updatedAt: string;
  pdfUri: string | null;
}

export interface PoolPerson {
  name: string;
  position: string;
  lastTestedAt: string;  // ISO string
  testCount: number;
}

export function resultStatusFromValue(value: number): BLResultStatus {
  if (value >= 0.20) return 'fail';
  if (value >= 0.10) return 'warning';
  return 'safe';
}

export const BL_RESULT_COLORS = {
  safe:    { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  warning: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  fail:    { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
};

export function countsByStatus(entries: BLEntry[]): Record<BLResultStatus, number> {
  return entries.reduce(
    (acc, e) => { acc[e.resultStatus] += 1; return acc; },
    { safe: 0, warning: 0, fail: 0 },
  );
}

export function formatBlDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' });
}
