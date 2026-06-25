import { StyleSheet } from 'react-native';

// Foreground for content sitting on the orange accent pill (Save / Crop apply /
// active tool). The accent stays orange in BOTH themes, but theme.colors.ink
// flips to near-white in dark mode and would wash out — so on-accent text/icons
// use a fixed dark ink ("black text on orange" is the brand convention).
export const ON_ACCENT_INK = '#1A1A1A';

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
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  canvasWrap: {
    flex: 1,
    backgroundColor: theme.colors.subtleSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Floating brush controls overlay (sibling of the captured photo View) ──
  // box-none container that fills the photo box; the two slots park the pills at
  // the image edges without intercepting draw touches in between.
  floatingLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  colorBarSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  sizeBarSlot: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  // photoBox is sized inline to photoLayout.{w,h} (so its aspect == the image
  // aspect) and centered by canvasWrap. It holds two absolute-fill children: the
  // captured photo View and the floating-controls overlay.
  photoBox: {
    position: 'relative',
  },
  // The captured View (== captureRef target). Fills photoBox, so display→pixel is
  // one uniform scale and captureRef preserves the true photo aspect.
  photoFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  toolbar: {
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 12,
  },

  // ── Tools row: distinct crop chip + scrollable draw tools ──
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  cropChip: {
    width: 60,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  cropChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.inkFaint,
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: theme.colors.hairline,
  },
  // flex:1 bounds the ScrollView to the row's remaining width so it actually
  // scrolls instead of overflowing (RN default flexShrink is 0).
  toolScrollView: {
    flex: 1,
  },
  toolScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  toolBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.subtleSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: {
    backgroundColor: theme.colors.accent,
  },

  // ── Primary save (orange pill, black text) ──
  saveBtn: {
    marginHorizontal: 16,
    marginTop: 2,
    height: 52,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.button,
  },
  saveBtnText: {
    color: ON_ACCENT_INK,
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Crop mode actions (cancel / apply, no aspect chips) ──
  cropActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  cropCancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropCancelText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  cropApplyBtn: {
    flex: 1,
    height: 52,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.button,
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
