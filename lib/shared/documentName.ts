/**
 * Canonical document display names, shared by the Expo app and the web dashboard.
 *
 * Single source of truth: both codebases import this module so the naming rule
 * never drifts. Keep it PURE — no React / React Native / DOM / i18n imports.
 * The app is Georgian-only (see CLAUDE.md), so fallbacks are Georgian literals.
 *
 * Imports:
 *   - Expo (repo root):  import { inspectionDisplayName } from '../lib/shared/documentName';
 *   - web-app (Vite):    import { inspectionDisplayName } from '@root/lib/shared/documentName';
 *
 * The display name is the document's type/template name — never a raw id slice.
 * Callers resolve the template/title string themselves and pass it in.
 */

const FALLBACK = {
  inspection: 'შემოწმების აქტი',
  report: 'რეპორტი',
  certificate: 'სერტიფიკატი',
  order: 'ბრძანება',
} as const;

/** Inspection title — the template name (e.g. "დამცავი ქამრები"), or a generic fallback. */
export function inspectionDisplayName(templateName?: string | null): string {
  return templateName?.trim() || FALLBACK.inspection;
}

/** Report title — the user-entered report title, or a generic fallback. */
export function reportDisplayName(title?: string | null): string {
  return title?.trim() || FALLBACK.report;
}

/** Certificate title — the certificate's conclusion text, or a generic fallback. */
export function certificateDisplayName(conclusionText?: string | null): string {
  return conclusionText?.trim() || FALLBACK.certificate;
}

/** Order title — the order's type label, or a generic fallback. */
export function orderDisplayName(typeLabel?: string | null): string {
  return typeLabel?.trim() || FALLBACK.order;
}
