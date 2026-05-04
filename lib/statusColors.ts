/**
 * Canonical status and incident colour maps.
 * All status-related colours in the app should be imported from here rather
 * than defined inline, so visual changes require edits in a single place.
 */

import { theme } from './theme';
import type { IncidentType } from '../types/models';

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
  completed: '#1D9E75',
  draft:     theme.colors.semantic.warning,   // #F59E0B
  overdue:   '#DC2626',
  due_today: theme.colors.semantic.warning,
  due_soon:  theme.colors.semantic.warning,
  upcoming:  theme.colors.neutral[400],       // #A8A49C
};

/** Icon name for the small circular StatusBadge overlay. */
export const STATUS_BADGE_ICON: Record<
  CalendarStatus,
  import('react-native').ViewStyle extends never ? string : string
> = {
  completed: 'checkmark',
  draft:     'pencil',
  overdue:   'alert',
  due_today: 'time',
  due_soon:  'time',
  upcoming:  'time-outline',
} as const;

/** Foreground colour used for status dots and row labels. */
export const STATUS_DOT_COLOR: Record<CalendarStatus, string> = {
  completed: '#1D9E75',
  draft:     theme.colors.semantic.warning,
  overdue:   '#DC2626',
  due_today: theme.colors.semantic.warning,
  due_soon:  theme.colors.semantic.warning,
  upcoming:  theme.colors.neutral[400],
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
