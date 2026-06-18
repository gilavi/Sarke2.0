import { StyleSheet } from 'react-native';
import type { Theme } from '../../lib/theme';

export function getConclusionStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 24,
      gap: 12,
    },
    embedded: { gap: 12 },
    avatar: { alignItems: 'center', paddingTop: 4, paddingBottom: 4 },
    photoBlock: { gap: 8 },
    photoLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.ink },
    completingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
      paddingTop: 8,
    },
    completingText: { fontSize: 14, color: theme.colors.inkSoft },
  });
}
