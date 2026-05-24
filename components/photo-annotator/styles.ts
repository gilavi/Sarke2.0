import { StyleSheet } from 'react-native';

/* ─────────────────────────── Styles ─────────────────────────── */

export function getstyles(theme: any) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.hairline,
    backgroundColor: theme.colors.card,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  canvasWrap: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  photoContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  toolbar: {
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
  },
  row: {
    paddingHorizontal: 12,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorBtnActive: {
    borderColor: theme.colors.ink,
    transform: [{ scale: 1.15 }],
  },
  whiteBtnRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.subtleSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.hairline,
    marginHorizontal: 4,
  },
  widthBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  widthBtnActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  widthLabel: {
    marginLeft: 8,
    fontSize: 13,
    color: theme.colors.inkSoft,
    fontWeight: '600',
    minWidth: 30,
  },
  saveBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    height: 50,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.button,
  },
  saveBtnText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
}

export function getmodalStyles(theme: any) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    gap: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.ink,
    backgroundColor: theme.colors.subtleSurface,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  cancelText: {
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
  },
  confirmText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
});
}
