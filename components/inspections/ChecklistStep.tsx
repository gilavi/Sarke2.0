/**
 * Reusable pass/fail checklist step for equipment inspection flows.
 * Renders a scrollable list of items with good / deficient / unusable verdict buttons,
 * optional per-item comment field, and optional photo thumbnail.
 */
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

export type ChecklistResult = 'good' | 'deficient' | 'unusable' | null;

export interface ChecklistItem {
  id: string;
  description: string;
  /** Optional section label — used to render section headers when showSectionHeaders=true */
  section?: string;
}

export interface ChecklistItemState {
  id: string;
  result: ChecklistResult;
  comment: string | null;
  photo_paths: string[];
}

export interface ChecklistStepProps {
  items: ChecklistItem[];
  states: ChecklistItemState[];
  onStateChange: (id: string, patch: Partial<ChecklistItemState>) => void;
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
  const styles = getStyles(theme);

  const [expandedComment, setExpandedComment] = useState<string | null>(null);

  function getState(id: string): ChecklistItemState {
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
        const state = getState(item.id);
        const active = state.result;
        const showHeader = showSectionHeaders && item.section && item.section !== lastSection;
        if (showHeader) lastSection = item.section;

        return (
          <View key={item.id}>
            {showHeader ? (
              <Text style={[styles.sectionHeader, { color: theme.colors.inkFaint, borderBottomColor: theme.colors.hairline }]}>
                {item.section}
              </Text>
            ) : null}

            <View style={[styles.row, { borderBottomColor: theme.colors.hairline }]}>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowLabel, { color: theme.colors.ink }]} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>

              <View style={styles.rowActions}>
                {/* Good ✓ */}
                <Pressable
                  style={[
                    styles.verdictBtn,
                    { borderColor: theme.colors.semantic.success },
                    active === 'good' && { backgroundColor: theme.colors.semantic.success },
                  ]}
                  onPress={() => onStateChange(item.id, { result: active === 'good' ? null : 'good' })}
                  hitSlop={6}
                  {...a11y('ვარგისია', undefined, 'radio')}
                >
                  <Text style={[
                    styles.verdictBtnText,
                    { color: active === 'good' ? '#fff' : theme.colors.semantic.success },
                  ]}>✓</Text>
                </Pressable>

                {/* Deficient ⚠ */}
                <Pressable
                  style={[
                    styles.verdictBtn,
                    { borderColor: theme.colors.semantic.warning },
                    active === 'deficient' && { backgroundColor: theme.colors.semantic.warning },
                  ]}
                  onPress={() => onStateChange(item.id, { result: active === 'deficient' ? null : 'deficient' })}
                  hitSlop={6}
                  {...a11y('ხარვეზი', undefined, 'radio')}
                >
                  <Text style={[
                    styles.verdictBtnText,
                    { color: active === 'deficient' ? '#fff' : theme.colors.semantic.warning },
                  ]}>⚠</Text>
                </Pressable>

                {/* Unusable ✗ */}
                <Pressable
                  style={[
                    styles.verdictBtn,
                    { borderColor: theme.colors.danger },
                    active === 'unusable' && { backgroundColor: theme.colors.danger },
                  ]}
                  onPress={() => onStateChange(item.id, { result: active === 'unusable' ? null : 'unusable' })}
                  hitSlop={6}
                  {...a11y('გამოუსადეგარია', undefined, 'radio')}
                >
                  <Text style={[
                    styles.verdictBtnText,
                    { color: active === 'unusable' ? '#fff' : theme.colors.danger },
                  ]}>✗</Text>
                </Pressable>

                {/* Comment toggle */}
                {showCommentButton ? <Pressable
                  style={[
                    styles.commentToggle,
                    expandedComment === item.id && { backgroundColor: theme.colors.accentSoft },
                  ]}
                  onPress={() => setExpandedComment(prev => prev === item.id ? null : item.id)}
                  hitSlop={6}
                  {...a11y('კომენტარი', undefined, 'button')}
                >
                  <Ionicons
                    name={state.comment?.trim() ? 'chatbubble' : 'chatbubble-outline'}
                    size={16}
                    color={state.comment?.trim() ? theme.colors.accent : theme.colors.inkSoft}
                  />
                </Pressable> : null}

                {/* Photo button */}
                {onPhotoPress ? (
                  <Pressable
                    style={styles.photoBtn}
                    onPress={() => onPhotoPress(item.id)}
                    hitSlop={6}
                    {...a11y('ფოტო', undefined, 'button')}
                  >
                    <Ionicons
                      name={state.photo_paths.length > 0 ? 'camera' : 'camera-outline'}
                      size={16}
                      color={state.photo_paths.length > 0 ? theme.colors.accent : theme.colors.inkSoft}
                    />
                    {state.photo_paths.length > 0 ? (
                      <Text style={[styles.photoCount, { color: theme.colors.accent }]}>
                        {state.photo_paths.length}
                      </Text>
                    ) : null}
                  </Pressable>
                ) : null}
              </View>
            </View>

            {showCommentButton && expandedComment === item.id ? (
              <View style={[styles.commentWrap, { borderBottomColor: theme.colors.hairline }]}>
                <FloatingLabelInput
                  label="კომენტარი"
                  value={state.comment ?? ''}
                  onChangeText={v => onStateChange(item.id, { comment: v || null })}
                  multiline
                  numberOfLines={2}
                />
              </View>
            ) : null}
          </View>
        );
      })}

      {footer ?? null}
    </KeyboardAwareScrollView>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingTop: 8,
      paddingBottom: 24,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowInfo: {
      flex: 1,
      minWidth: 0,
    },
    rowLabel: {
      fontSize: 13,
      fontWeight: '400',
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    verdictBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verdictBtnText: {
      fontSize: 14,
      fontWeight: '700',
    },
    commentToggle: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
    },
    photoCount: {
      fontSize: 10,
      fontWeight: '700',
    },
    commentWrap: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
  });
}
