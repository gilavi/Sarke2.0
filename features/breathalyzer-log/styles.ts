import { StyleSheet } from 'react-native';

/**
 * Themed style factory for the breathalyzer log flow. Monochrome throughout —
 * result severity is carried by icon + label (see ResultStatus), never color.
 * Primary CTAs / single-selects use the Button + StatusChip primitives, which
 * own their own styling, so nothing here paints an accent fill.
 */
export function getStyles(theme: any) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },

    // ── Empty state ──────────────────────────────────────────────────────────
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.inkSoft,
      textAlign: 'center',
    },

    closedBadge: {
      backgroundColor: theme.colors.subtleSurface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    closedBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft },

    // ── Info bar (date + device S/N) ─────────────────────────────────────────
    infoBar: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.hairline,
      backgroundColor: theme.colors.surface,
    },
    infoDate: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },

    // ── Entry list ───────────────────────────────────────────────────────────
    listContent: { padding: 16, gap: 8 },
    emptyEntries: { alignItems: 'center', paddingVertical: 40 },
    emptyEntriesText: { fontSize: 14, color: theme.colors.inkFaint, fontWeight: '500' },

    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    entryRepeatIndent: { marginLeft: 16 },
    entryIndex: {
      width: 22,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.inkFaint,
    },
    entryName: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    entryPos: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 1 },
    entryRepeatTag: {
      fontSize: 10,
      color: theme.colors.inkSoft,
      fontWeight: '600',
      marginBottom: 1,
    },

    // ── Repeat-required banner (monochrome) ──────────────────────────────────
    repeatCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 4,
    },
    repeatCardTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.ink },
    repeatCardSub: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },

    // ── Bottom action bar ────────────────────────────────────────────────────
    bottomBar: {
      paddingHorizontal: 16,
      paddingTop: 10,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },

    // ── Wizard step scroll + footer ──────────────────────────────────────────
    stepScroll: { flex: 1 },
    stepScrollContent: { padding: 20, paddingBottom: 32, gap: 16 },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },

    // ── Person step: suggestions ─────────────────────────────────────────────
    suggestionList: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.hairline,
    },
    suggestionAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggestionInitials: { fontSize: 12, fontWeight: '700', color: theme.colors.inkSoft },
    suggestionName: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    suggestionPos: { fontSize: 12, color: theme.colors.inkSoft },
    suggestionDate: { fontSize: 11, color: theme.colors.inkFaint },

    // ── Result step ──────────────────────────────────────────────────────────
    resultInputWrap: {
      borderRadius: 20,
      paddingVertical: 32,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    resultInput: {
      fontSize: 52,
      fontWeight: '800',
      textAlign: 'center',
      minWidth: 150,
      color: theme.colors.ink,
    },
    noteCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    noteTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.ink },
    noteSub: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
    inlineError: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.semantic.danger,
      marginTop: 2,
    },

    // ── Signature step ───────────────────────────────────────────────────────
    sigPrompt: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    sigPlaceholder: {
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 14,
      borderStyle: 'dashed',
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sigPlaceholderDone: { borderColor: theme.colors.ink, borderStyle: 'solid' },
    sigDone: { alignItems: 'center', gap: 4 },
    sigDoneText: { color: theme.colors.ink, fontWeight: '600' },
    sigHintText: { color: theme.colors.inkSoft, fontSize: 13 },
    refuseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
    refuseText: { fontSize: 14, color: theme.colors.ink },
  });
}

export type BreathalyzerStyles = ReturnType<typeof getStyles>;
