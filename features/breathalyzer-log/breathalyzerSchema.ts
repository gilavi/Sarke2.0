// Pure helpers + form shape for the breathalyzer log flow. No React, no theme,
// no Supabase — everything here is deterministic given its inputs.

import type {
  BLEntry,
  BLTestType,
  BreathalizerLog,
} from '../../types/breathalyzerLog';

type T = (key: string, opts?: Record<string, unknown>) => string;

export type AddEntryStep = 1 | 2 | 3 | 4;

/** i18n keys for the four add-entry steps, in order (drives the FlowHeader stepper). */
export const ADD_ENTRY_STEP_KEYS = [
  'breathalyzer.stepPerson',
  'breathalyzer.stepTestType',
  'breathalyzer.stepResult',
  'breathalyzer.stepSignature',
] as const;

/** Today as YYYY-MM-DD. A function (not a module constant) so it never goes stale. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parse a typed reading ("0,05" / "0.2") into a non-negative number. */
export function parseResult(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  return isNaN(n) ? 0 : Math.max(0, n);
}

export function timeDisplay(iso: string): string {
  return new Date(iso).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function daysSince(iso: string, t: T): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return t('breathalyzer.relToday');
  if (diff === 1) return t('breathalyzer.relDay1');
  return t('breathalyzer.relDayN', { count: diff });
}

/** Mutable form state shared by the add-entry wizard + its steps. */
export interface EntryForm {
  name: string;
  position: string;
  testType: BLTestType;
  resultRaw: string;
  signature: string | null; // base64 PNG, no data: prefix
  refusedSignature: boolean;
}

export const INITIAL_ENTRY_FORM: EntryForm = {
  name: '',
  position: '',
  testType: 'primary',
  resultRaw: '0.00',
  signature: null,
  refusedSignature: false,
};

/** Whether the wizard may advance past the given step (used by the submit guard). */
export function canAdvanceEntry(step: AddEntryStep, form: EntryForm): boolean {
  if (step === 1) return form.name.trim().length > 0 && form.position.trim().length > 0;
  return true; // steps 2 (type) + 3 (result, clamped ≥ 0) are always advanceable
}

/** Whether the final save is allowed (person filled + signed or refusal recorded). */
export function canSaveEntry(form: EntryForm): boolean {
  return (
    form.name.trim().length > 0 &&
    form.position.trim().length > 0 &&
    (form.signature !== null || form.refusedSignature)
  );
}

/**
 * The most recent FAIL entry that has no repeat test logged against it, or null.
 * Drives the "repeat test required" banner on the log screen — derived from the
 * data so it survives reloads (unlike the old ephemeral post-save flag).
 */
export function pendingRepeatEntry(log: BreathalizerLog | null | undefined): BLEntry | null {
  if (!log) return null;
  const entries = log.entries;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.resultStatus !== 'fail') continue;
    const hasRepeat = entries.some(other => other.relatedEntryId === e.id);
    if (!hasRepeat) return e;
  }
  return null;
}
