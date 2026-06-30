import { StyleSheet } from 'react-native';

export function makeStyles(theme: any) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.ink,
      marginTop: 6,
      marginBottom: 4,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      marginTop: 8,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      padding: 12,
      gap: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardIndex: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    removeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    addBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.accent },
    scoreRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
    scoreCol: { flex: 1 },
    riskBadge: {
      minWidth: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 6,
    },
    riskBadgeNum: { fontSize: 16, fontWeight: '800' },
    riskBadgeLabel: { fontSize: 9, fontWeight: '700' },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft, marginBottom: 2 },
    bottomBar: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
      paddingHorizontal: 16,
    },
  });
}

export type RAStyles = ReturnType<typeof makeStyles>;
