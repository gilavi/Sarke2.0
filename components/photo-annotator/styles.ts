import { StyleSheet } from 'react-native';
import { primary } from '../../lib/design-tokens';

// Foreground for content sitting on the orange accent (Done button, active tool,
// active size dot). The accent is orange in BOTH app themes, so on-accent text/
// icons use a fixed dark ink ("black on orange" is the brand convention).
export const ON_ACCENT_INK = '#1A1A1A';

/* ───────────────────────── Editor chrome palette ─────────────────────────
 * The photo editor is ALWAYS dark, regardless of the app's light/dark setting —
 * the standard for photo editors (the image is the hero and pops against dark
 * chrome). These are fixed values, not theme tokens, so the editor never flips
 * to a washed-out light surface. Annotation colors (schema.COLORS) and the
 * brand accent are the only colors shared with the rest of the app.
 */
export const EDITOR = {
  bg: '#0D0D0D', // screen + canvas surround
  panel: '#151515', // bottom sheet
  ghost: 'rgba(255,255,255,0.09)', // ghost circular buttons
  ghostBorder: 'rgba(255,255,255,0.10)',
  hairline: 'rgba(255,255,255,0.08)',
  track: 'rgba(255,255,255,0.06)', // segmented control / size pill track
  ink: '#F5F5F5',
  inkSoft: '#9A9A9A',
  inkFaint: '#6A6A6A',
  accent: primary[500], // brand orange #FE7A43
  onAccent: ON_ACCENT_INK,
  danger: '#EF6A6A',
  scrim: 'rgba(16,16,16,0.82)', // floating pills over the image
  scrimBorder: 'rgba(255,255,255,0.12)',
  // Crop-window chrome
  cropFrame: 'rgba(255,255,255,0.9)',
  cropGrid: 'rgba(255,255,255,0.3)',
} as const;

/* ─────────────────────────── Chrome styles ─────────────────────────── */

export function getstyles() {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: EDITOR.bg,
    },

    // ── Header: ✕ cancel · title · ✓ done ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      height: 56,
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: EDITOR.ghost,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
      color: EDITOR.ink,
      letterSpacing: 0.1,
    },
    doneBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: EDITOR.accent,
    },

    // ── Canvas ──
    canvasWrap: {
      flex: 1,
      backgroundColor: EDITOR.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // photoBox is sized inline to photoLayout.{w,h} (aspect == image aspect) and
    // centered by canvasWrap.
    photoBox: {
      position: 'relative',
    },
    // The captured markup View (== captureRef target). Fills photoBox, so
    // display→pixel is one uniform scale and captureRef keeps the true aspect.
    photoFill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: EDITOR.bg,
      overflow: 'hidden',
    },

    // ── Floating undo / clear pill (markup) — sibling of the captured View so it
    //    never bakes into the saved JPG. ──
    histrip: {
      position: 'absolute',
      left: 12,
      top: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: EDITOR.scrim,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: EDITOR.scrimBorder,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 5,
    },
    histripBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    histripSep: {
      width: StyleSheet.hairlineWidth,
      height: 18,
      backgroundColor: 'rgba(255,255,255,0.16)',
      marginHorizontal: 2,
    },

    /* ─────────────── Bottom sheet (toolbar) ─────────────── */
    sheet: {
      backgroundColor: EDITOR.panel,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: EDITOR.hairline,
      paddingTop: 12,
    },

    // Segmented Crop / Markup control
    seg: {
      flexDirection: 'row',
      alignSelf: 'center',
      width: 200,
      backgroundColor: EDITOR.track,
      borderRadius: 999,
      padding: 3,
      marginBottom: 12,
    },
    segItem: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segItemActive: {
      backgroundColor: EDITOR.accent,
    },
    segLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: EDITOR.inkSoft,
    },
    segLabelActive: {
      color: EDITOR.onAccent,
    },

    // Crop helper row (hint + reset)
    cropRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 6,
      minHeight: 44,
    },
    cropHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      flexShrink: 1,
    },
    cropHintText: {
      fontSize: 12,
      color: EDITOR.inkFaint,
      flexShrink: 1,
    },
    resetPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: EDITOR.ghost,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    resetText: {
      fontSize: 13,
      fontWeight: '600',
      color: EDITOR.ink,
    },

    // Markup tools row
    toolsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    toolBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: EDITOR.ghost,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolBtnActive: {
      backgroundColor: EDITOR.accent,
    },

    // Markup options (color swatches + size dots)
    optRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 4,
      minHeight: 40,
    },
    swatchGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    swatch: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    swatchLite: {
      borderColor: 'rgba(255,255,255,0.25)',
    },
    swatchActive: {
      borderColor: '#FFFFFF',
    },
    sizeGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: EDITOR.track,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    sizeCell: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    optHint: {
      fontSize: 12,
      color: EDITOR.inkFaint,
      paddingVertical: 6,
    },
  });
}

/* ─────────────── Text-tool modal (dark, matches the editor) ─────────────── */

export function getmodalStyles() {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    // The card is the stop-propagation Pressable itself — giving it a concrete
    // width (100% up to maxWidth) avoids the classic collapse where an unsized
    // wrapper makes `width:'100%'` resolve to the content width (a tiny modal).
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: EDITOR.panel,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: EDITOR.hairline,
      padding: 20,
      gap: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: EDITOR.ink,
    },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.18)',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: EDITOR.ink,
      backgroundColor: EDITOR.track,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 13,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    cancelText: {
      color: EDITOR.ink,
      fontWeight: '600',
      fontSize: 15,
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 13,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: EDITOR.accent,
    },
    confirmText: {
      color: EDITOR.onAccent,
      fontWeight: '700',
      fontSize: 15,
    },
  });
}
