// Pure form model + validation helpers for the incident flow
// (features/incident-new). No React, no side effects — safe to unit-test and
// to share between the state hook, the step components, and the save hook.

import type { IncidentType } from '../../types/models';

export type Step = 1 | 2 | 3 | 4;

export interface IncidentPhoto {
  uri: string;
  /**
   * Storage path when the photo is already uploaded (edit mode). Such photos
   * are kept as-is on save (never re-uploaded, never deleted on a failed
   * commit). New photos picked in this session have no `existingPath`.
   */
  existingPath?: string;
}

export interface FormData {
  type: IncidentType | null;
  injuredName: string;
  injuredRole: string;
  dateTime: Date;
  location: string;
  description: string;
  cause: string;
  actionsTaken: string;
  witnesses: string[];
  photos: IncidentPhoto[];
}

export const INITIAL_FORM: FormData = {
  type: null,
  injuredName: '',
  injuredRole: '',
  dateTime: new Date(),
  location: '',
  description: '',
  cause: '',
  actionsTaken: '',
  witnesses: [],
  photos: [],
};

/**
 * Real content beyond the step-1 type tap — the bar for silently keeping a
 * draft on exit (a bare type pick isn't worth a row in Drafts).
 */
export function computeHasSubstance(form: FormData): boolean {
  return (
    form.injuredName.trim().length > 0 ||
    form.injuredRole.trim().length > 0 ||
    form.location.trim().length > 0 ||
    form.description.trim().length > 0 ||
    form.cause.trim().length > 0 ||
    form.actionsTaken.trim().length > 0 ||
    form.witnesses.length > 0 ||
    form.photos.length > 0
  );
}

/** Next-button validation predicate for the current step. */
export function canAdvanceStep(step: Step, form: FormData): boolean {
  if (step === 1) return form.type !== null;
  if (step === 2) return form.location.trim().length > 0;
  if (step === 3) return form.description.trim().length > 0 && form.cause.trim().length > 0;
  return true;
}

/**
 * Ordered keys of the empty required fields on the current step. Single source
 * of truth for scroll-to-error; keys MUST match the `registerField('<key>')`
 * wrappers in the step components.
 */
export function missingFieldsForStep(step: Step, form: FormData): string[] {
  if (step === 2) return form.location.trim() ? [] : ['location'];
  if (step === 3) {
    return [
      ...(form.description.trim() ? [] : ['description']),
      ...(form.cause.trim() ? [] : ['cause']),
    ];
  }
  return [];
}
