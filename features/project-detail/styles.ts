import { StyleSheet } from 'react-native';

export function getStyles(theme: any) {
  return StyleSheet.create({
  // ── Sheet - sits flush below the arch ──
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // Arch peak (actual bezier peak at t=0.5): y = 0.25*SVG_EDGE_Y + 0 + 0.25*SVG_EDGE_Y = 34 within SVG.
  // Screen y = (220 - 80) + 34 = 174. Logo half = 40. marginTop = 174 - 220 - 40 = -86.
  logoContainer: {
    alignItems: 'center',
    marginTop: -86,
    marginBottom: 4,
  },
  logoOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accent,
    borderWidth: 3,
    borderColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  logoInitials: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.white,
  },
  logoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
    borderWidth: 2,
    borderColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Floating pill buttons over map
  floatingBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  // Centered project info below logo
  projectInfoCenter: {
    paddingTop: 6,
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.ink,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroMetaText: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    marginTop: 2,
  },
  heroPhoneText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 6,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.hairline,
  },

  // ── Section Cards ──
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    overflow: 'hidden',
  },
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
  sectionAddLink: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  badgeGreen: {
    backgroundColor: theme.colors.semantic.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 16,
  },
  badgeGreenText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.semantic.success,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    marginTop: 14,
  },

  // ── List Rows (flat, hairline-separated — matches the home screen + InspectionRow) ──
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
  sigThumb: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  missingChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.semantic.warningSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 16,
  },
  missingChipText: {
    color: theme.colors.semantic.warning,
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Sub-sections ──
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subSectionLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subSectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.inkFaint,
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Actions ──
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    marginTop: 12,
  },
  addBtnText: {
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: theme.colors.inkFaint,
    fontWeight: '500',
  },

  // ── Swipe ──
  swipeDelete: {
    width: 72,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 12,
  },

});
}
