// რისკების შეფასება — risk-assessment register types. One table
// (risk_assessments), two document types discriminated by `docType`.

export type RADocType = 'risk_assessment' | 'ppe_determination';

// ── doc B: risk-assessment hazard row ──────────────────────────────────────────
export interface RiskHazardEntry {
  id: string;
  hazard: string;            // საფრთხეთა იდენტიფიცირება
  persons: string;           // პირთა წრე
  injuryType: string;        // დაშავების / დაზიანების ტიპი
  existingControls: string;  // არსებული კონტ. ზომები
  probability: number;       // ა — 1..5
  severity: number;          // შ — 1..5  (risk = probability × severity)
  additionalControls: string; // დამატებითი კონტ. ზომები
  residualProbability: number; // ნარჩენი ა — 1..5
  residualSeverity: number;    // ნარჩენი შ — 1..5
  measures: string;          // გასატარებელი ზომები / რეაგირება
  responsible: string;       // პასუხისმგ. პირი / ვადა
  reviewDate: string;        // გადახედვის სავარ. თარიღი
}

// ── doc A: PPE-by-position row (იდს განსაზღვრა) ─────────────────────────────────
export interface PpeEntry {
  id: string;
  position: string;   // სამუშაო პოზიცია
  activities: string; // სამუშაო აქტივობების აღწერა
  hazards: string;    // ამ სამუშაოდან გამომდინარე საფრთხეები (რისკები)
  bodyParts: string;  // სხეულის დასაცავი ნაწილები
  ppe: string;        // გამოსაყენებელი ინდ. დაცვის საშუალებები
}

export type RAEntry = RiskHazardEntry | PpeEntry;

export interface RASignatory {
  name: string;
  position: string;
  signature: string | null; // base64 PNG, no data: prefix
  date: string | null;
}

export interface RiskAssessment {
  id: string;
  projectId: string;
  userId: string;
  docType: RADocType;
  /** Header fields keyed by name (per doc type — see RA_HEADER_FIELDS). */
  header: Record<string, string>;
  entries: RAEntry[];
  /** Keyed by role (e.g. 'assessor', 'companyRep', 'hse', 'director'). */
  signatories: Record<string, RASignatory>;
  status: 'draft' | 'completed';
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RAVerdictCategory = 'critical' | 'veryHigh' | 'high' | 'medium' | 'low';

// ── scoring helpers (matrix from the source document) ──────────────────────────

/** Risk level = probability × severity (1..25). */
export function riskScore(probability: number, severity: number): number {
  const p = clamp1to5(probability);
  const s = clamp1to5(severity);
  if (!p || !s) return 0;
  return p * s;
}

export function riskCategory(score: number): RAVerdictCategory | null {
  if (score <= 0) return null;
  if (score >= 20) return 'critical';   // 20–25
  if (score >= 10) return 'veryHigh';   // 10–16
  if (score >= 5) return 'high';        // 5–9
  if (score >= 3) return 'medium';      // 3–4
  return 'low';                         // 1–2
}

function clamp1to5(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 1) return 0;
  return Math.min(5, Math.round(n));
}

/** Georgian labels for the matrix legend (source document). */
export const RA_PROBABILITY_LABELS: Record<number, string> = {
  1: 'ძალიან საეჭვოა',
  2: 'საეჭვოა',
  3: 'შესაძლებელია',
  4: 'სავარაუდოა',
  5: 'განსაზღვრულია',
};

export const RA_SEVERITY_LABELS: Record<number, string> = {
  1: 'უმნიშვნელო',
  2: 'მცირე',
  3: 'ზომიერი',
  4: 'სერიოზული',
  5: 'კატასტროფული',
};

export const RA_CATEGORY_LABEL: Record<RAVerdictCategory, string> = {
  critical: 'კრიტიკული',
  veryHigh: 'ძალიან მაღალი',
  high: 'მაღალი',
  medium: 'საშუალო',
  low: 'დაბალი',
};

/** Cell background colour for the PDF matrix / risk pills, by category. */
export const RA_CATEGORY_COLOR: Record<RAVerdictCategory, string> = {
  critical: '#991B1B',
  veryHigh: '#B45309',
  high: '#92400E',
  medium: '#1D4ED8',
  low: '#065F46',
};

export const RA_CATEGORY_BG: Record<RAVerdictCategory, string> = {
  critical: '#FEE2E2',
  veryHigh: '#FFEDD5',
  high: '#FEF3C7',
  medium: '#DBEAFE',
  low: '#D1FAE5',
};

export const RA_DOC_TITLE: Record<RADocType, string> = {
  risk_assessment: 'რისკების შეფასება',
  ppe_determination: 'ინდ. დაცვის საშუალებების განსაზღვრა',
};

/** Empty row factories. */
export function emptyHazardEntry(id: string): RiskHazardEntry {
  return {
    id, hazard: '', persons: '', injuryType: '', existingControls: '',
    probability: 0, severity: 0, additionalControls: '',
    residualProbability: 0, residualSeverity: 0, measures: '', responsible: '', reviewDate: '',
  };
}

export function emptyPpeEntry(id: string): PpeEntry {
  return { id, position: '', activities: '', hazards: '', bodyParts: '', ppe: '' };
}
