/**
 * Shared types and design tokens for the web InspectionWizard.
 *
 * The wizard is a fully generic, web-only full-page modal used across every
 * inspection flow (harnesses, fall-protection, forklift, …). A flow supplies a
 * {@link WizardConfig}; the wizard owns the per-item answer state internally and
 * hands the final snapshot back through {@link WizardConfig.onComplete}.
 */

import type { ViewStyle } from 'react-native';

/**
 * Escape hatch for web-only CSS keys (`cursor`, `transition*`, `outlineStyle`,
 * `position: 'fixed'`, …) that react-native's strict `ViewStyle` type omits but
 * react-native-web honours at runtime. Keeps the keys in `StyleSheet.create`
 * without resorting to `any`. Web only — these properties are inert on native.
 */
export function webStyle(style: Record<string, string | number>): ViewStyle {
  return style as ViewStyle;
}

/** A single answer value for a question. */
export type AnswerValue = 'yes' | 'no' | 'na';

/** Lifecycle status of one inspectable item (harness, device, …). */
export type WizardItemStatus = 'pending' | 'in_progress' | 'done' | 'problem';

/** One question rendered as a row in the question table. */
export interface Question {
  id: string;
  label: string;
  /** Which answer options to offer. Order is preserved in the segmented control. */
  options: AnswerValue[];
  /** Show a comment textarea when the item is answered `no`. */
  hasComment?: boolean;
  /** Show a photo-attach button when the item is answered `no`. */
  hasPhoto?: boolean;
}

/** Per-question detail captured when a problem (`no`) is flagged. */
export interface AnswerDetail {
  comment?: string;
  /** Local URIs / data-URLs of attached photos. Upload is owned by the caller. */
  photos?: string[];
}

/** One inspectable item and its working answer state. */
export interface WizardItem {
  id: string;
  label: string;
  status: WizardItemStatus;
  /** Map of `question.id` → selected answer. */
  answers: Record<string, AnswerValue>;
  /** Optional map of `question.id` → comment/photo detail. */
  details?: Record<string, AnswerDetail>;
  /** Optional cached tally; recomputed by the wizard as answers change. */
  stats?: { yes: number; no: number };
}

/** Configuration passed in by a concrete inspection flow. */
export interface WizardConfig {
  projectName: string;
  projectLogo?: string;
  actName: string;
  /** Inspectable items (harnesses, devices, …). May be empty to start. */
  items: WizardItem[];
  /** Singular noun for one item, e.g. "ქამარი", "მოწყობილობა". */
  itemLabel: string;
  /** Questions asked for every item. */
  questions: Question[];
  /** Called when the user finishes the whole inspection. */
  onComplete: (data: WizardData) => void;
  /** Called when the user dismisses the wizard (X / Escape). */
  onClose: () => void;
  /** Optional: persist a single item when advancing. Should resolve when saved. */
  onSaveItem?: (item: WizardItem) => Promise<void> | void;
  /** Optional: create a fresh blank item when the user clicks "add new". */
  onAddItem?: () => WizardItem;
}

/** Final snapshot handed back on completion. */
export interface WizardData {
  items: WizardItem[];
}

/** Centralised palette so every sub-component stays in visual sync. */
export const WIZARD_COLORS = {
  border: '#E8E6E0',
  sidebarBg: '#F9F8F6',
  rowAltBg: '#FAFAF8',
  text: '#1A1A1A',
  textGray: '#6B7280',
  green: '#1D9E75',
  greenSoftBg: '#E8F5EE',
  red: '#EF4444',
  na: '#6B7280',
  segmentBg: '#F1F0ED',
  segmentHover: '#E5E4E0',
  dashedBorder: '#CBD5E1',
  addText: '#64748B',
} as const;
