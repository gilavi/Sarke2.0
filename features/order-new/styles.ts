import { StyleSheet } from 'react-native';

export function makeStyles(theme: any) {
  return StyleSheet.create({
    stepTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.ink,
      marginBottom: 4,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      marginTop: 4,
      marginBottom: -4,
    },
    // type selector
    typeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    typeCardSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    typeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accentSoft,
    },
    typeIconSelected: {
      backgroundColor: theme.colors.accent,
    },
    typeLabel: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.ink,
      fontWeight: '500',
    },
    // summary
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
    },
    summaryLabel: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      width: 110,
      flexShrink: 0,
    },
    summaryValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    bottomBar: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
      paddingHorizontal: 16,
    },
  });
}

export type OrderStyles = ReturnType<typeof makeStyles>;
