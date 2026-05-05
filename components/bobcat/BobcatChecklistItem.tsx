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
import type { BobcatItemResult, BobcatItemState, BobcatChecklistEntry } from '../../types/bobcat';
import { a11y } from '../../lib/accessibility';

interface Props {
  index: number;
  entry: BobcatChecklistEntry;
  state: BobcatItemState;
  onChange: (patch: Partial<Pick<BobcatItemState, 'result' | 'comment'>>) => void;
  onAddPhoto: () => void;
  onDeletePhoto: (path: string) => void;
}

export const BobcatChecklistItem = memo(function BobcatChecklistItem({
  index,
  entry,
  state,
  onChange,
  onAddPhoto,
  onDeletePhoto,
}: Props) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [commentDraft, setCommentDraft] = useState(state.comment ?? '');

  const expanded = state.result === 'deficient' || state.result === 'unusable';

  // Custom label/neutral flag for the 3rd chip (e.g. "არ გააჩნია")
  const unusableLabel = entry.unusableLabel ?? 'გამოუსადეგ.';
  const unusableIsNeutral = entry.unusableIsNeutral === true;

  const setResult = useCallback((r: BobcatItemResult) => {
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

  const goodActive     = state.result === 'good';
  const defActive      = state.result === 'deficient';
  const unusableActive = state.result === 'unusable';

  // Accordion background: neutral for "not applicable" items, red for genuinely unusable
  const accordionStyle = defActive
    ? styles.accordionDef
    : unusableIsNeutral
    ? styles.accordionNeutral
    : styles.accordionBad;

  return (
    <View style={styles.container}>
      {/* Row: number + label + description + chips */}
      <View style={[styles.row, expanded && styles.rowExpanded]}>
        {/* Number badge */}
        <View style={styles.numBadge}>
          <Text style={styles.numText}>{index + 1}</Text>
        </View>

        {/* Description */}
        <View style={styles.desc}>
          <Text style={styles.labelText}>{entry.label}</Text>
          <Text style={styles.descText}>{entry.description}</Text>
        </View>

        {/* Status chips */}
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, styles.chipGood, goodActive && styles.chipGoodActive]}
            onPress={() => setResult('good')}
            hitSlop={8}
            {...a11y('კარგია', '✓ კარგია', 'button')}
          >
            <Ionicons
              name="checkmark"
              size={14}
              color={goodActive ? theme.colors.white : theme.colors.semantic.success}
            />
          </Pressable>

          <Pressable
            style={[styles.chip, styles.chipDef, defActive && styles.chipDefActive]}
            onPress={() => setResult('deficient')}
            hitSlop={8}
            {...a11y('ნაკლი', '⚠ ნაკლი', 'button')}
          >
            <Ionicons
              name="warning-outline"
              size={13}
              color={defActive ? theme.colors.white : theme.colors.warn}
            />
          </Pressable>

          {/* 3rd chip: either "გამოუსადეგ." or a custom label (e.g. "არ გააჩნია") */}
          <Pressable
            style={[
              styles.chip,
              unusableIsNeutral ? styles.chipNA : styles.chipBad,
              unusableActive && (unusableIsNeutral ? styles.chipNAActive : styles.chipBadActive),
            ]}
            onPress={() => setResult('unusable')}
            hitSlop={8}
            {...a11y(unusableLabel, `✗ ${unusableLabel}`, 'button')}
          >
            <Ionicons
              name={unusableIsNeutral ? 'remove' : 'close'}
              size={14}
              color={
                unusableActive
                  ? theme.colors.white
                  : unusableIsNeutral
                  ? theme.colors.inkSoft
                  : theme.colors.danger
              }
            />
          </Pressable>
        </View>
      </View>

      {/* Accordion — comment + photos */}
      {expanded && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(100)}
          style={[styles.accordion, accordionStyle]}
        >
          <FloatingLabelInput
            label="ხარვეზის აღწერა"
            value={commentDraft}
            onChangeText={handleCommentChange}
            multiline
            numberOfLines={2}
          />

          {/* Photo strip */}
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
              <Ionicons name="camera-outline" size={20} color={theme.colors.inkSoft} />
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

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      marginBottom: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    rowExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomWidth: 0,
    },
    numBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    numText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.inkSoft,
    },
    desc: {
      flex: 1,
      gap: 2,
    },
    labelText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    descText: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      lineHeight: 16,
    },
    chips: {
      flexDirection: 'row',
      gap: 4,
      paddingTop: 2,
    },
    chip: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    // Good (green)
    chipGood: {
      borderColor: theme.colors.semantic.success,
      backgroundColor: theme.colors.semantic.successSoft,
    },
    chipGoodActive: {
      backgroundColor: theme.colors.semantic.success,
    },
    // Deficient (amber)
    chipDef: {
      borderColor: theme.colors.warn,
      backgroundColor: theme.colors.warnSoft,
    },
    chipDefActive: {
      backgroundColor: theme.colors.warn,
    },
    // Unusable / genuinely bad (red)
    chipBad: {
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
    },
    chipBadActive: {
      backgroundColor: theme.colors.danger,
    },
    // Not-applicable neutral (gray) — for items where "unusable" means "not present"
    chipNA: {
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.subtleSurface,
    },
    chipNAActive: {
      backgroundColor: theme.colors.inkSoft,
    },
    // Accordions
    accordion: {
      padding: 12,
      gap: 10,
      borderWidth: 1,
      borderTopWidth: 0,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
    },
    accordionDef: {
      borderColor: theme.colors.warn,
      backgroundColor: theme.colors.warnSoft,
    },
    accordionBad: {
      borderColor: theme.colors.dangerBorder,
      backgroundColor: theme.colors.dangerTint,
    },
    // Neutral accordion — gray, for "not applicable" items
    accordionNeutral: {
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.subtleSurface,
    },
    photoStrip: {
      gap: 8,
      paddingVertical: 2,
    },
    addPhoto: {
      width: 64,
      height: 64,
      borderRadius: 8,
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
      width: 64,
      height: 64,
      borderRadius: 8,
      overflow: 'hidden',
    },
    thumbImg: {
      width: 64,
      height: 64,
    },
    thumbDelete: {
      position: 'absolute',
      top: 2,
      right: 2,
    },
  });
}
