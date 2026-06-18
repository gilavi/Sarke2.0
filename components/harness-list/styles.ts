import { StyleSheet } from 'react-native';
import type { Theme } from '../../lib/theme';

// The header now comes from the shared FlowHeader and the rows from
// ChecklistItemRow, so only the pinned footer + primary CTA remain here.
export function gets(theme: Theme) {
  return StyleSheet.create({
    footer: {
      paddingHorizontal: 16,
      paddingTop: 8,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
    },
  });
}
