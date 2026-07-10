/**
 * Canonical status and incident colour maps.
 * All status-related colours in the app should be imported from here rather
 * than defined inline, so visual changes require edits in a single place.
 */

import { theme } from './theme';
import type { IncidentType, PaymentRecord } from '../types/models';

// ── Inspection / calendar event status ────────────────────────────────────────

/** Status values that can appear on a calendar badge or inspection row. */
export type CalendarStatus =
  | 'completed'
  | 'draft'
  | 'overdue'
  | 'due_today'
  | 'due_soon'
  | 'upcoming';

/** Solid background colour for the small circular StatusBadge overlay. */
export const STATUS_BADGE_BG: Record<CalendarStatus, string> = {
  completed: theme.colors.semantic.success,
  draft:     theme.colors.semantic.warning,   // #F59E0B
  overdue:   '#DC2626',
  due_today: theme.colors.semantic.warning,
  due_soon:  theme.colors.semantic.warning,
  upcoming:  theme.colors.neutral[400],       // #A8A49C
};

/** Foreground colour used for status dots and row labels. */
export const STATUS_DOT_COLOR: Record<CalendarStatus, string> = {
  completed: theme.colors.semantic.success,
  draft:     theme.colors.semantic.warning,
  overdue:   '#DC2626',
  due_today: theme.colors.semantic.warning,
  due_soon:  theme.colors.semantic.warning,
  upcoming:  theme.colors.neutral[400],
};

// ── Payment status ────────────────────────────────────────────────────────────

/**
 * Text + soft-fill (used at `${color}20`) colour for a payment-history status
 * badge. Maps onto the canonical semantic palette — NOT the raw iOS system
 * colours (#34C759 / #FF9500 / #FF3B30 / #8E8E93) the more tab hardcoded before,
 * which reintroduced a second "success" green. `success` is now the same
 * `semantic.success` green as every other success state in the app. The base
 * semantic hues + `neutral[400]` are identical in light and dark, so this static
 * map is theme-independent (like {@link STATUS_BADGE_BG}).
 */
export const PAYMENT_STATUS_COLORS: Record<PaymentRecord['status'], string> = {
  success:  theme.colors.semantic.success,   // #10B981 — one green, app-wide
  pending:  theme.colors.semantic.warning,   // #F59E0B
  failed:   theme.colors.semantic.danger,    // #EF4444
  refunded: theme.colors.neutral[400],       // muted / de-emphasised
};

// ── Incident type ─────────────────────────────────────────────────────────────

export const INCIDENT_COLORS: Record<
  IncidentType,
  { bg: string; text: string; border: string }
> = {
  minor:    { bg: theme.colors.semantic.warningSoft, text: '#92400E', border: theme.colors.semantic.warning },
  severe:   { bg: '#FFEDD5',                         text: '#9A3412', border: '#F97316' },
  fatal:    { bg: theme.colors.semantic.dangerSoft,  text: '#991B1B', border: theme.colors.semantic.danger },
  mass:     { bg: theme.colors.semantic.dangerSoft,  text: '#991B1B', border: theme.colors.semantic.danger },
  nearmiss: { bg: '#EDE9FE',                         text: '#5B21B6', border: '#8B5CF6' },
};

export type IncidentBadgeColor = { bg: string; text: string; border: string };

/** Dark-mode counterpart to {@link INCIDENT_COLORS}. */
export const INCIDENT_COLORS_DARK: Record<IncidentType, IncidentBadgeColor> = {
  minor:    { bg: '#3F2E0F', text: '#FCD34D', border: '#F59E0B' },
  severe:   { bg: '#3D1F08', text: '#FCA673', border: '#F97316' },
  fatal:    { bg: '#3A1F1F', text: '#FCA5A5', border: '#EF4444' },
  mass:     { bg: '#3A1F1F', text: '#FCA5A5', border: '#EF4444' },
  nearmiss: { bg: '#2D1F4F', text: '#C4B5FD', border: '#8B5CF6' },
};

/**
 * Canonical incident severity palette for the current colour scheme. Use this
 * everywhere an incident type maps to a badge — never redefine the hexes inline.
 */
export function incidentColors(isDark: boolean): Record<IncidentType, IncidentBadgeColor> {
  return isDark ? INCIDENT_COLORS_DARK : INCIDENT_COLORS;
}
