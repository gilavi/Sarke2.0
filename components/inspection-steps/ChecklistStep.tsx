/**
 * Reusable pass/fail checklist step for equipment inspection flows.
 * Renders a scrollable list of checklist items — each row is handled by
 * ChecklistRow, which owns the verdict buttons, comment toggle, and photo
 * badge. This file manages scroll state and section header rendering only.
 */
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { ChecklistRow } from './ChecklistRow';

// Re-export item types so existing equipment routes don't need to change imports.
export type { ChecklistResult, ChecklistItem, ChecklistItemState } from './ChecklistRow';

export interface ChecklistStepProps {
  items: import('./ChecklistRow').ChecklistItem[];
  states: import('./ChecklistRow').ChecklistItemState[];
  onStateChange: (id: string, patch: Partial<import('./ChecklistRow').ChecklistItemState>) => void;
  onPhotoPress?: (id: string) => void;
  showSectionHeaders?: boolean;
  /** Whether to show the per-item comment expand button (default true) */
  showCommentButton?: boolean;
  /** Slot for additional content rendered below the list */
  footer?: ReactNode;
}

export function ChecklistStep({
  items,
  states,
  onStateChange,
  onPhotoPress,
  showSectionHeaders = false,
  showCommentButton = true,
  footer,
}: ChecklistStepProps) {
  const { theme } = useTheme();
  const [expandedComment, setExpandedComment] = useState<string | null>(null);

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
              onPhotoPress={onPhotoPress ? () => onPhotoPress(item.id) : undefined}
              showCommentButton={showCommentButton}
              isCommentExpanded={expandedComment === item.id}
              onCommentToggle={() =>
                setExpandedComment(prev => (prev === item.id ? null : item.id))
              }
            />
          </View>
        );
      })}
      {footer ?? null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flexGrow: 1, paddingTop: 8, paddingBottom: 24 },
  sectionHeader: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
});
