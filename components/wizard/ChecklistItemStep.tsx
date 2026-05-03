import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { useTheme, type Theme } from '../../lib/theme';
import { useAccessibilitySettings } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { a11y } from '../../lib/accessibility';
import type { ChecklistCatalogItem, ChecklistItemState } from '../../types/checklistWizard';

interface Props {
  index: number;
  total: number;
  catalog: ChecklistCatalogItem;
  state: ChecklistItemState;
  onChange: (patch: Partial<Pick<ChecklistItemState, 'result' | 'comment'>>) => void;
  onAddPhoto: () => void;
  onDeletePhoto: (path: string) => void;
  onHelp?: () => void;
}

export const ChecklistItemStep = memo(function ChecklistItemStep({
  index,
  total,
  catalog,
  state,
  onChange,
  onAddPhoto,
  onDeletePhoto,
  onHelp,
}: Props) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [commentDraft, setCommentDraft] = useState(state.comment ?? '');

  const unusableLabel = catalog.unusableLabel ?? 'გამოუსადეგ.';
  const unusableIsNeutral = catalog.unusableIsNeutral === true;
  const showUnusable = true; // always show the 3rd option

  const setResult = useCallback((r: NonNullable<ChecklistItemState['result']>) => {
    haptic.light();
    if (state.result === r) {
      onChange({ result: null, comment: null });
      setCommentDraft('');
    } else {
      onChange({ result: r });
    }
  }, [state.result, onChange]);

  const handleCommentChange = useCallback((text: string) => {
    setCommentDraft(text);
    onChange({ comment: text || null });
  }, [onChange]);

  const goodActive = state.result === 'good';
  const defActive = state.result === 'deficient';
  const unusableActive = state.result === 'unusable';
  const hasProblem = defActive || unusableActive;

  return (
    <View style={styles.root}>
      {/* Progress header */}
      <View style={styles.progressRow}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{catalog.category}</Text>
        </View>
        <Text style={styles.progressText}>
          პუნქტი {index + 1} / {total}
        </Text>
        {onHelp ? (
          <Pressable
            onPress={onHelp}
            hitSlop={12}
            style={styles.helpBtn}
            {...a11y('დახმარება', 'კომპონენტის აღწერა', 'button')}
          >
            <Text style={styles.helpText}>?</Text>
          </Pressable>
        ) : (
          <View style={styles.helpPlaceholder} />
        )}
      </View>

      {/* Item content */}
      <View style={styles.content}>
        <Text style={styles.label}>{catalog.label}</Text>
        <Text style={styles.description}>{catalog.description}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Primary: Good */}
        <Pressable
          style={[styles.btnPrimary, goodActive && styles.btnPrimaryActive]}
          onPress={() => setResult('good')}
          {...a11y('გამართულია', '✓ გამართულია — შემდეგ პუნქტზე გადასვლა', 'button')}
        >
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={goodActive ? '#fff' : theme.colors.semantic.success}
          />
          <Text style={[styles.btnPrimaryText, goodActive && styles.btnPrimaryTextActive]}>
            გამართულია
          </Text>
        </Pressable>

        {/* Secondary: Deficient */}
        <Pressable
          style={[styles.btnSecondary, defActive && styles.btnSecondaryActive]}
          onPress={() => setResult('deficient')}
          {...a11y('ხარვეზია', '⚠ ხარვეზია — კომენტარის და ფოტოს დამატება', 'button')}
        >
          <Ionicons
            name="warning-outline"
            size={20}
            color={defActive ? '#fff' : theme.colors.warn}
          />
          <Text style={[styles.btnSecondaryText, defActive && styles.btnSecondaryTextActive]}>
            ხარვეზია
          </Text>
        </Pressable>

        {/* Tertiary: Unusable / Not present */}
        {showUnusable && (
          <Pressable
            style={[
              styles.btnTertiary,
              unusableIsNeutral ? styles.btnTertiaryNeutral : styles.btnTertiaryBad,
              unusableActive && (unusableIsNeutral ? styles.btnTertiaryNeutralActive : styles.btnTertiaryBadActive),
            ]}
            onPress={() => setResult('unusable')}
            {...a11y(unusableLabel, `✗ ${unusableLabel}`, 'button')}
          >
            <Ionicons
              name={unusableIsNeutral ? 'remove-circle-outline' : 'close-circle-outline'}
              size={18}
              color={
                unusableActive
                  ? '#fff'
                  : unusableIsNeutral
                  ? theme.colors.inkSoft
                  : theme.colors.danger
              }
            />
            <Text
              style={[
                styles.btnTertiaryText,
                unusableActive && styles.btnTertiaryTextActive,
                !unusableActive && unusableIsNeutral && { color: theme.colors.inkSoft },
                !unusableActive && !unusableIsNeutral && { color: theme.colors.danger },
              ]}
            >
              {unusableLabel}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Problem details — comment + photos */}
      {hasProblem && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(180)}
          exiting={reduceMotion ? undefined : FadeOut.duration(100)}
          style={styles.problemPanel}
        >
          <FloatingLabelInput
            label="ხარვეზის აღწერა"
            value={commentDraft}
            onChangeText={handleCommentChange}
            multiline
            numberOfLines={3}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {state.photo_paths.map(path => (
              <PhotoThumb
                key={path}
                path={path}
                onDelete={() => onDeletePhoto(path)}
              />
            ))}
            <Pressable
              style={styles.addPhoto}
              onPress={onAddPhoto}
              {...a11y('ფოტოს დამატება', 'ფოტოს გადაღება ან ბიბლიოთეკიდან', 'button')}
            >
              <Ionicons name="camera-outline" size={22} color={theme.colors.inkSoft} />
              <Text style={styles.addPhotoLabel}>+ ფოტო</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
});

// ── Photo thumbnail ──────────────────────────────────────────────────────────

const PhotoThumb = memo(function PhotoThumb({
  path,
  onDelete,
}: {
  path: string;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const [uri, setUri] = useState('');

  useEffect(() => {
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, path).then(setUri).catch(() => {});
  }, [path]);

  return (
    <View style={styles.thumb}>
      <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" />
      <Pressable
        style={styles.thumbDelete}
        onPress={onDelete}
        hitSlop={8}
        {...a11y('ფოტოს წაშლა', undefined, 'button')}
      >
        <Ionicons name="close-circle" size={18} color={theme.colors.white} />
      </Pressable>
    </View>
  );
});

// ── Styles ───────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    categoryPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: theme.colors.subtleSurface,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    categoryText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    progressText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    helpBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    helpText: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.accent,
      lineHeight: 16,
    },
    helpPlaceholder: {
      width: 28,
    },
    content: {
      gap: 8,
      marginBottom: 24,
    },
    label: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.ink,
      lineHeight: 28,
    },
    description: {
      fontSize: 15,
      color: theme.colors.inkSoft,
      lineHeight: 22,
    },
    actions: {
      gap: 10,
    },
    btnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.semantic.success,
      backgroundColor: theme.colors.semantic.successSoft,
    },
    btnPrimaryActive: {
      backgroundColor: theme.colors.semantic.success,
      borderColor: theme.colors.semantic.success,
    },
    btnPrimaryText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.semantic.success,
    },
    btnPrimaryTextActive: {
      color: '#fff',
    },
    btnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.warn,
      backgroundColor: theme.colors.warnSoft,
    },
    btnSecondaryActive: {
      backgroundColor: theme.colors.warn,
      borderColor: theme.colors.warn,
    },
    btnSecondaryText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.warn,
    },
    btnSecondaryTextActive: {
      color: '#fff',
    },
    btnTertiary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1.5,
      alignSelf: 'center',
      paddingHorizontal: 20,
    },
    btnTertiaryNeutral: {
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.subtleSurface,
    },
    btnTertiaryBad: {
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
    },
    btnTertiaryNeutralActive: {
      backgroundColor: theme.colors.inkSoft,
      borderColor: theme.colors.inkSoft,
    },
    btnTertiaryBadActive: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
    },
    btnTertiaryText: {
      fontSize: 14,
      fontWeight: '600',
    },
    btnTertiaryTextActive: {
      color: '#fff',
    },
    problemPanel: {
      marginTop: 16,
      padding: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.warnSoft,
      borderWidth: 1,
      borderColor: theme.colors.warn,
      gap: 12,
    },
    photoStrip: {
      gap: 8,
      paddingVertical: 4,
    },
    addPhoto: {
      width: 72,
      height: 72,
      borderRadius: 10,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    addPhotoLabel: {
      fontSize: 11,
      color: theme.colors.inkSoft,
    },
    thumb: {
      width: 72,
      height: 72,
      borderRadius: 10,
      overflow: 'hidden',
    },
    thumbImg: {
      width: 72,
      height: 72,
    },
    thumbDelete: {
      position: 'absolute',
      top: 2,
      right: 2,
    },
  });
}
