// wizardSchema.ts - pure (UI-free) helpers for the inspection wizard.
// Owns: step model, answer-shape validation, measure parsing,
// scaffold column styling, AsyncStorage key helpers, and a bounded
// in-memory photo-URL cache shared across PhotoThumb + PhotoPreviewModal.

import type { LucideIcon } from 'lucide-react-native';
import { CircleCheck, CircleMinus, CircleX } from 'lucide-react-native';
import type { Answer, AnswerPhoto, Question, Template } from '../../types/models';

// AsyncStorage key helpers - mid-flow user state is persisted per inspection
// id so backing out and returning resumes where the user left off.
export const stepKey = (qid: string) => `wizard:${qid}:step`;
export const harnessCountKey = (qid: string) => `wizard:${qid}:harnessCount`;
export const conclusionKey = (qid: string) => `wizard:${qid}:conclusion`;
export const safetyKey = (qid: string) => `wizard:${qid}:safety`;
export const harnessNameKey = (qid: string) => `wizard:${qid}:harnessName`;

// Empty/null is always allowed - the user may not have answered yet.
export function isAnswerShapeValidForType(type: Question['type'], a: Answer): boolean {
  switch (type) {
    case 'yesno':
      return a.value_bool === null || typeof a.value_bool === 'boolean';
    case 'measure':
      return a.value_num === null || typeof a.value_num === 'number';
    case 'freetext':
      return a.value_text === null || typeof a.value_text === 'string';
    case 'component_grid':
      return a.grid_values === null || (typeof a.grid_values === 'object' && !Array.isArray(a.grid_values));
    case 'photo_upload':
      return true; // photos are stored in answer_photos, not Answer.value_*
    default:
      return true;
  }
}

// --- Flat steps ---

export type FlatStep =
  | { kind: 'question'; question: Question }
  | { kind: 'gridRow'; question: Question; row: string }
  | { kind: 'harnessFlow'; question: Question }
  | { kind: 'conclusion' }
  | { kind: 'empty' };

export function buildSteps(
  questions: Question[],
  harnessRowCount: number,
): FlatStep[] {
  // harnessRowCount is consumed by HarnessListFlow itself; we flatten one
  // step per harness question rather than per row.
  void harnessRowCount;
  const sorted = [...questions].sort((a, b) =>
    a.section === b.section ? a.order - b.order : a.section - b.section,
  );
  const steps: FlatStep[] = [];
  for (const q of sorted) {
    // Section 3 photo_upload is folded into the conclusion screen as
    // "საერთო ფოტოები"; section 4 freetext duplicates the conclusion textarea.
    // Keep the question rows in the DB so answers/photos still attach to a
    // question_id, just skip the standalone steps.
    if (q.type === 'photo_upload') continue;
    if (q.type === 'freetext' && q.section === 4) continue;
    if (q.type === 'component_grid' && q.grid_rows) {
      const isHarness = q.grid_rows[0] === 'N1';
      if (isHarness) {
        // HarnessListFlow: count picker → per-harness chip list (full-screen takeover).
        steps.push({ kind: 'harnessFlow', question: q });
      } else {
        for (const row of q.grid_rows) steps.push({ kind: 'gridRow', question: q, row });
      }
    } else {
      steps.push({ kind: 'question', question: q });
    }
  }
  if (steps.length === 0 && questions.length === 0) {
    return [{ kind: 'empty' }];
  }
  steps.push({ kind: 'conclusion' });
  return steps;
}

// In-memory cache for photo display URLs to avoid redundant fetches.
// Bounded - Map preserves insertion order, so the oldest entry is evicted
// once the cap is hit. Without a bound this Map grew for the lifetime of
// the JS context and leaked memory across multiple inspection sessions.
const PHOTO_URL_CACHE_MAX = 100;
export const photoUrlCache = new Map<string, string>();
export function setPhotoUrlCache(key: string, url: string) {
  if (photoUrlCache.has(key)) photoUrlCache.delete(key);
  photoUrlCache.set(key, url);
  if (photoUrlCache.size > PHOTO_URL_CACHE_MAX) {
    const oldest = photoUrlCache.keys().next().value;
    if (oldest !== undefined) photoUrlCache.delete(oldest);
  }
}

// Whether the current step has any user input - flips the bottom button between
// "გამოტოვება" (skip) and "შემდეგი" (next). Conclusion has its own validation.
export function hasAnswer(
  step: FlatStep,
  answers: Record<string, Answer>,
  photos: Record<string, AnswerPhoto[]>,
  conclusion: string,
  safetyVerdict: 'safe' | 'caution' | 'unsafe' | null,
  harnessName: string,
  template: Template | null,
): boolean {
  if (step.kind === 'conclusion') {
    const harnessOk = template?.category !== 'harness' || harnessName.trim().length > 0;
    return safetyVerdict !== null && conclusion.trim().length > 0 && harnessOk;
  }
  // harnessFlow manages its own completion internally - always considered answered.
  if (step.kind === 'harnessFlow') return true;
  if (step.kind === 'empty') return false;
  const a = answers[step.question.id];
  if (step.kind === 'gridRow') {
    const row = (a?.grid_values ?? {})[step.row];
    return !!row && Object.keys(row).some(k => k !== 'კომენტარი' || (row[k] && row[k].trim()));
  }
  const q = step.question;
  if (q.type === 'yesno') return a?.value_bool === true || a?.value_bool === false;
  if (q.type === 'measure') return a?.value_num != null;
  if (q.type === 'freetext') return !!(a?.value_text && a.value_text.trim());
  if (q.type === 'photo_upload') return !!a && (photos[a.id] ?? []).length > 0;
  return false;
}

// Parse "1,5" or "1.5" to a number; returns null if empty/invalid.
export function parseMeasure(s: string): number | null {
  const cleaned = s.replace(',', '.').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Returns an error string if the measure is out of range, null otherwise.
export function measureError(q: Question, value: number | null): string | null {
  if (value === null) return null;
  if (q.min_val != null && value < q.min_val) {
    return `მინიმუმი: ${q.min_val}${q.unit ? ' ' + q.unit : ''}`;
  }
  if (q.max_val != null && value > q.max_val) {
    return `მაქსიმუმი: ${q.max_val}${q.unit ? ' ' + q.unit : ''}`;
  }
  return null;
}

// Returns a tint/bg/icon triple for scaffold status columns.
export function scaffoldColStyle(
  col: string,
  theme: any,
): { tint: string; bg: string; icon: LucideIcon } {
  if (col.includes('დაზიანება')) return { tint: theme.colors.danger, bg: theme.colors.dangerSoft, icon: CircleX };
  if (col.includes('გამართულია')) return { tint: theme.colors.accent, bg: theme.colors.accentSoft, icon: CircleCheck };
  return { tint: theme.colors.inkSoft, bg: theme.colors.subtleSurface, icon: CircleMinus };
}
