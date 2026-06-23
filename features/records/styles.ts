import { StyleSheet } from 'react-native';

/**
 * Shared styles for the per-type record "section" widgets and their
 * rows (Home widgets, and the building blocks reused by History / Drafts).
 *
 * These mirror the section + list-row subset of
 * `features/project-detail/styles.ts` on purpose — the values are identical
 * so Home "matches the project screen". Keep the two in sync. Crucially,
 * there is no draft/completed status chrome here: rows carry a neutral
 * type glyph (`recordIcon`) for identity, never a status badge.
 */
export function getRecordStyles(theme: any) {
  return StyleSheet.create({
    // Flat section — no card box. The host wraps these in the page gutter
    // (paddingHorizontal: 20), which is the ONLY horizontal padding, so titles
    // and list rows line up flush with the rest of the page content. Sections
    // are separated by the host's `gap`; rows by hairlines.
    sectionCard: {},
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    sectionCount: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    sectionLink: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      backgroundColor: 'transparent',
    },
    listRowBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.hairline,
    },
    listRowTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    listRowSubtitle: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      marginTop: 2,
    },
    // Neutral per-type glyph — identity, NOT draft/completed status.
    recordIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    widgetEmpty: {
      paddingVertical: 18,
      alignItems: 'center',
    },
    widgetEmptyText: {
      fontSize: 13,
      color: theme.colors.inkFaint,
      fontWeight: '500',
    },
  });
}
