/**
 * Reusable checklist step for equipment inspection flows. Renders a monochrome
 * legend + a scrollable list of items, each handled by ChecklistRow (which now
 * delegates to the shared ChecklistItemRow). Section headers + scroll only.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { ChecklistLegend } from '../inspection-parts/ChecklistLegend';
import { ChecklistRow, CHECKLIST_LEGEND } from './ChecklistRow';

// Re-export item types so existing equipment routes don't need to change imports.
export type { ChecklistResult, ChecklistItem, ChecklistItemState } from './ChecklistRow';

export interface ChecklistStepProps {
  items: import('./ChecklistRow').ChecklistItem[];
  states: import('./ChecklistRow').ChecklistItemState[];
  onStateChange: (id: string, patch: Partial<import('./ChecklistRow').ChecklistItemState>) => void;
  showSectionHeaders?: boolean;
  /** Slot for additional content rendered below the list */
  footer?: ReactNode;
  // ── Legacy props (per-row notes/photos removed app-wide). Accepted but ignored. ──
  onPhotoPress?: (id: string) => void;
  showCommentButton?: boolean;
}

export function ChecklistStep({
  items,
  states,
  onStateChange,
  showSectionHeaders = false,
  footer,
}: ChecklistStepProps) {
  const { theme } = useTheme();

  function getState(id: string) {
    return states.find(s => s.id === id) ?? { id, result: null, comment: null, photo_paths: [] };
  }

  let lastSection: string | undefined;

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={120}
    >
      <View style={styles.legendWrap}>
        <ChecklistLegend items={CHECKLIST_LEGEND} />
      </View>
      {items.map(item => {
        const showHeader = showSectionHeaders && item.section && item.section !== lastSection;
        if (showHeader) lastSection = item.section;
        return (
          <View key={item.id}>
            {showHeader ? (
              <Text style={[styles.sectionHeader, { color: theme.colors.inkFaint, borderBottomColor: theme.colors.hairline }]}>
                {item.section}
              </Text>
            ) : null}
            <ChecklistRow
              item={item}
              state={getState(item.id)}
              onStateChange={patch => onStateChange(item.id, patch)}
            />
          </View>
        );
      })}
      {footer ?? null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flexGrow: 1, paddingTop: 8, paddingBottom: 24, paddingHorizontal: 16, gap: 8 },
  legendWrap:    { paddingBottom: 2 },
  sectionHeader: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingTop: 14, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
});
