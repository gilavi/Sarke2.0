/**
 * Canonical document display names, shared by the Expo app and the web dashboard.
 *
 * Single source of truth: both codebases import this module so the naming rule
 * never drifts. Keep it PURE - no React / React Native / DOM / i18n imports.
 * The app is Georgian-only (see CLAUDE.md), so fallbacks are Georgian literals.
 *
 * Imports:
 *   - Expo (repo root):  import { inspectionDisplayName } from '../lib/shared/documentName';
 *   - web-app (Vite):    import { inspectionDisplayName } from '@root/lib/shared/documentName';
 *
 * The display name is the document's type/template name - never a raw id slice.
 * Callers resolve the template/title string themselves and pass it in.
 */

const FALLBACK = {
  inspection: 'შემოწმების აქტი',
  report: 'რეპორტი',
  certificate: 'სერტიფიკატი',
  order: 'ბრძანება',
} as const;

/**
 * Maps the formal `templates.name` (as stored in the DB / used in PDF reports)
 * to the short UI display name shown in list rows, cards, and screen titles,
 * where `შემოწმება` is already implied by the section header / category chip.
 * Templates already stored with short names fall through unchanged.
 *
 * Add new template name pairs here - this is the single map for both codebases.
 * PDF/print paths must NOT use this; they keep the full formal name.
 */
const INSPECTION_SHORT_NAME: Record<string, string> = {
  'ფასადის ხარაჩოს შემოწმების აქტი': 'ფასადის ხარაჩო',
  'მობილური ხარაჩოს შემოწმების აქტი': 'მობილური ხარაჩო',
  'მობილური ხარაჩოს შემოწმების აქტი N3': 'მობილური ხარაჩო N3',
  'დამცავი ქამრების შემოწმების აქტი': 'დამცავი ქამრები',
  'ციცხვიანი დამტვირთველის შემოწმების აქტი': 'ციცხვიანი დამტვირთველი',
  'დიდი ციცხვიანი დამტვირთველის შემოწმება': 'დიდი ციცხვიანი დამტვირთველი',
  'ექსკავატორის ტექნიკური შემოწმების აქტი': 'ექსკავატორი',
  'ტექნიკური აღჭურვილობის შემოწმების აქტი': 'ტექნიკური აღჭურვილობა',
  'ტვირთის მიმღები პლატფორმის შემოწმების აქტი': 'ტვირთის მიმღები პლატფორმა',
};

/** Inspection title - the short display name for the template (e.g. "ექსკავატორი"), or a generic fallback. */
export function inspectionDisplayName(templateName?: string | null): string {
  const trimmed = templateName?.trim();
  if (!trimmed) return FALLBACK.inspection;
  return INSPECTION_SHORT_NAME[trimmed] ?? trimmed;
}

/** Report title - the user-entered report title, or a generic fallback. */
export function reportDisplayName(title?: string | null): string {
  return title?.trim() || FALLBACK.report;
}

/** Certificate title - the certificate's conclusion text, or a generic fallback. */
export function certificateDisplayName(conclusionText?: string | null): string {
  return conclusionText?.trim() || FALLBACK.certificate;
}

/** Order title - the order's type label, or a generic fallback. */
export function orderDisplayName(typeLabel?: string | null): string {
  return typeLabel?.trim() || FALLBACK.order;
}
