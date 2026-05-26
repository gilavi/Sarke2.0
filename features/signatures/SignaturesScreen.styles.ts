// features/signatures/SignaturesScreen.styles.ts
//
// Styles for SignaturesScreen, factored out so the screen component itself
// fits inside the 200-line component target.

import { StyleSheet } from 'react-native';
import type { Theme } from '../../lib/theme';

export function makeSignaturesScreenStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    headerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    headerPillText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.subtleSurface,
    },
    pressed: { opacity: 0.7 },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
      gap: 24,
    },
    section: { gap: 12 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    emptyCaption: {
      fontSize: 13,
      color: theme.colors.inkFaint,
      fontStyle: 'italic',
    },
    rowsStack: { gap: 12 },
    footer: {
      padding: 16,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.surface,
    },
    addRowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.surface,
    },
    addRowText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.accent,
    },
  });
}
