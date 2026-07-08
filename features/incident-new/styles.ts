import { StyleSheet } from 'react-native';

export function makeStyles(theme: any) {
  return StyleSheet.create({
    // step title
    stepTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.ink,
      marginBottom: 4,
    },

    // leading severity dot for the type-card Selector
    typeCardDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },

    // warning banner
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: theme.colors.semantic.dangerSoft,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.dangerBorder,
      padding: 12,
    },
    warningBannerText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.danger,
      fontWeight: '600',
      lineHeight: 20,
    },

    // near-miss note
    nearMissNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 10,
    },
    nearMissNoteText: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      fontWeight: '500',
    },

    // section/field label (used where Input label prop isn't applicable)
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
      marginBottom: 2,
    },

    // inline required-field error (custom controls without an `error` prop)
    requiredError: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.danger,
      marginTop: 2,
    },

    // witnesses
    witnessRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 8,
      padding: 10,
    },
    witnessName: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.ink,
    },
    witnessInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },

    // photos
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    photoThumb: {
      width: 88,
      height: 88,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceSecondary,
    },
    photoRemoveBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 10,
    },
    addPhotoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      borderStyle: 'dashed',
    },
    addPhotoBtnText: {
      fontSize: 14,
      color: theme.colors.accent,
      fontWeight: '600',
    },

    // summary card
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    summaryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.subtleSurface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 4,
    },
    summaryBadgeDot: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
    },
    summaryBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
    },
    summaryLabel: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      width: 90,
      flexShrink: 0,
    },
    summaryValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.ink,
    },

    // inspector row
    inspectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inspectorSigBox: {
      width: 56,
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    inspectorName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    inspectorRole: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      marginTop: 2,
    },
    signedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.semantic.successSoft,
      borderRadius: 16,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    signedChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.semantic.success,
    },

    // bottom bar
    bottomBar: {
      paddingTop: 12,
      paddingHorizontal: 16,
    },
  });
}

export type IncidentStyles = ReturnType<typeof makeStyles>;
