import { StyleSheet } from 'react-native';
import type { Theme } from '../../lib/theme';

/**
 * Selector option styles. Border/fill colors are animated per-option (see
 * {@link SelectorOptionChip}/{@link SelectorOptionRow}); the values here are the
 * resting defaults + all layout. Kept in its own file so `Selector.tsx` and
 * `SelectorOption.tsx` share one source without a parent⇄child import cycle.
 */
export function getSelectorStyles(theme: Theme) {
  return StyleSheet.create({
    group: { gap: 8 },
    groupLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    disabled: { opacity: 0.4 },

    // rows
    rowList: { gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },

    // list (divided full-bleed rows, for sheets / scrollable pickers)
    listContainer: {},
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    listRowError: { borderBottomColor: theme.colors.semantic.danger },

    rowTextWrap: { flex: 1, gap: 2 },
    rowText: { fontSize: 15, color: theme.colors.ink, fontWeight: '500' },
    rowTextActive: { color: theme.colors.ink, fontWeight: '700' },
    rowSubtitle: { fontSize: 12, color: theme.colors.inkFaint },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: theme.colors.ink },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.ink },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: { borderColor: theme.colors.ink, backgroundColor: theme.colors.ink },
    checkboxInner: { width: 9, height: 9, borderRadius: 2, backgroundColor: theme.colors.white },

    // chips
    chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    chipText: { fontSize: 14, color: theme.colors.inkSoft },
    chipTextActive: { color: theme.colors.ink, fontWeight: '700' },
  });
}
