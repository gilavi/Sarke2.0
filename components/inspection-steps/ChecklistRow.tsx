/**
 * Single row in a checklist step.
 * Renders the item description, 1/2/3 verdict buttons, optional comment
 * toggle, optional photo badge, and the inline comment input when expanded.
 * Extracted from ChecklistStep to keep both files under the 200-line limit.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

export type ChecklistResult = 'good' | 'deficient' | 'unusable' | null;

export interface ChecklistItem {
  id: string;
  description: string;
  /** Optional section label — used to render section headers in ChecklistStep */
  section?: string;
}

export interface ChecklistItemState {
  id: string;
  result: ChecklistResult;
  comment: string | null;
  photo_paths: string[];
}

export interface ChecklistRowProps {
  item: ChecklistItem;
  state: ChecklistItemState;
  /** Called with only the changed fields — the caller supplies the id. */
  onStateChange: (patch: Partial<ChecklistItemState>) => void;
  onPhotoPress?: () => void;
  showCommentButton: boolean;
  isCommentExpanded: boolean;
  onCommentToggle: () => void;
}

export function ChecklistRow({
  item,
  state,
  onStateChange,
  onPhotoPress,
  showCommentButton,
  isCommentExpanded,
  onCommentToggle,
}: ChecklistRowProps) {
  const { theme } = useTheme();
  const styles = getRowStyles();
  const active = state.result;

  return (
    <View>
      <View style={[styles.row, { borderBottomColor: theme.colors.hairline }]}>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowLabel, { color: theme.colors.ink }]} numberOfLines={2}>
            {item.description}
          </Text>
        </View>

        <View style={styles.rowActions}>
          {/* 1 — ვარგისია */}
          <Pressable
            style={[
              styles.verdictBtn,
              {
                borderColor: active === 'good' ? theme.colors.ink : theme.colors.border,
                backgroundColor: active === 'good' ? theme.colors.subtleSurface : theme.colors.surface,
              },
            ]}
            onPress={() => onStateChange({ result: active === 'good' ? null : 'good' })}
            hitSlop={6}
            {...a11y('1 — ვარგისია', undefined, 'radio', { selected: active === 'good' })}
          >
            <Text style={[
              styles.verdictBtnText,
              { color: active === 'good' ? theme.colors.ink : theme.colors.inkSoft },
            ]}>1</Text>
          </Pressable>

          {/* 2 — ხარვეზი */}
          <Pressable
            style={[
              styles.verdictBtn,
              {
                borderColor: active === 'deficient' ? theme.colors.ink : theme.colors.border,
                backgroundColor: active === 'deficient' ? theme.colors.subtleSurface : theme.colors.surface,
              },
            ]}
            onPress={() => onStateChange({ result: active === 'deficient' ? null : 'deficient' })}
            hitSlop={6}
            {...a11y('2 — ხარვეზი', undefined, 'radio', { selected: active === 'deficient' })}
          >
            <Text style={[
              styles.verdictBtnText,
              { color: active === 'deficient' ? theme.colors.ink : theme.colors.inkSoft },
            ]}>2</Text>
          </Pressable>

          {/* 3 — გამოუსადეგარია */}
          <Pressable
            style={[
              styles.verdictBtn,
              {
                borderColor: active === 'unusable' ? theme.colors.ink : theme.colors.border,
                backgroundColor: active === 'unusable' ? theme.colors.subtleSurface : theme.colors.surface,
              },
            ]}
            onPress={() => onStateChange({ result: active === 'unusable' ? null : 'unusable' })}
            hitSlop={6}
            {...a11y('3 — გამოუსადეგარია', undefined, 'radio', { selected: active === 'unusable' })}
          >
            <Text style={[
              styles.verdictBtnText,
              { color: active === 'unusable' ? theme.colors.ink : theme.colors.inkSoft },
            ]}>3</Text>
          </Pressable>

          {/* Comment toggle */}
          {showCommentButton ? (
            <Pressable
              style={[
                styles.commentToggle,
                isCommentExpanded && { backgroundColor: theme.colors.accentSoft },
              ]}
              onPress={onCommentToggle}
              hitSlop={6}
              {...a11y('კომენტარი', undefined, 'button')}
            >
              <Ionicons
                name={state.comment?.trim() ? 'chatbubble' : 'chatbubble-outline'}
                size={16}
                color={state.comment?.trim() ? theme.colors.accent : theme.colors.inkSoft}
              />
            </Pressable>
          ) : null}

          {/* Photo button */}
          {onPhotoPress ? (
            <Pressable
              style={styles.photoBtn}
              onPress={onPhotoPress}
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

      {showCommentButton && isCommentExpanded ? (
        <View style={[styles.commentWrap, { borderBottomColor: theme.colors.hairline }]}>
          <FloatingLabelInput
            label="კომენტარი"
            value={state.comment ?? ''}
            onChangeText={v => onStateChange({ comment: v || null })}
            multiline
            numberOfLines={2}
          />
        </View>
      ) : null}
    </View>
  );
}

function getRowStyles() {
  return StyleSheet.create({
    row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
    rowInfo:      { flex: 1, minWidth: 0 },
    rowLabel:     { fontSize: 13, fontWeight: '400' },
    rowActions:   { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
    verdictBtn:   { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    verdictBtnText: { fontSize: 14, fontWeight: '700' },
    commentToggle:{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    photoBtn:     { flexDirection: 'row', alignItems: 'center', gap: 2, width: 32, height: 32, borderRadius: 8, justifyContent: 'center' },
    photoCount:   { fontSize: 10, fontWeight: '700' },
    commentWrap:  { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  });
}
