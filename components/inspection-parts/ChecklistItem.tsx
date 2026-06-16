import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

export interface ChecklistItemOptions {
  a: string;           // green chip — "კარგი" / "კი" / "აკმაყოფილებს" / "✓"
  b: string;           // amber chip (three_state) or red critical chip (four_state) / "✗"
  c?: string;          // optional 3rd chip — "N/A" / "Z" minor warning
  cIsNeutral?: boolean; // gray chip when true (three_state only)
  d?: string;          // optional 4th chip (four_state only) — neutral "N"
}

export interface ChecklistItemProps {
  id: number;
  label: string;
  description?: string;
  type?: 'three_state' | 'binary' | 'four_state'; // default 'three_state'
  options: ChecklistItemOptions;
  value: string | null;
  onChange: (value: string | null) => void;
  comment?: string;
  onCommentChange?: (text: string) => void;
  photoPaths?: string[];
  onAddPhoto?: () => void;
  onDeletePhoto?: (path: string) => void;
  showAccordion?: boolean; // default true
}

export const ChecklistItem = memo(function ChecklistItem({
  id,
  label,
  description,
  type = 'three_state',
  options,
  value,
  onChange,
  comment,
  onCommentChange,
  photoPaths = [],
  onAddPhoto,
  onDeletePhoto,
  showAccordion = true,
}: ChecklistItemProps) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [commentDraft, setCommentDraft] = useState(comment ?? '');

  // Sync external comment into local draft when it changes
  useEffect(() => {
    setCommentDraft(comment ?? '');
  }, [comment]);

  const isBinary    = type === 'binary';
  const isFourState = type === 'four_state';
  const cIsNeutral  = options.cIsNeutral === true;

  // four_state: b=critical(red) opens accordion; c=minor(amber) opens accordion; d=neutral, no accordion
  // three_state: b(amber) and c both open accordion
  const expanded =
    showAccordion &&
    !isBinary &&
    (value === options.b || (!!options.c && value === options.c));

  const setChip = useCallback((v: string) => {
    haptic.light();
    if (value === v) {
      onChange(null);
      setCommentDraft('');
      onCommentChange?.('');
    } else {
      onChange(v);
    }
  }, [value, onChange, onCommentChange]);

  const handleCommentChange = useCallback((text: string) => {
    setCommentDraft(text);
    onCommentChange?.(text || null as any);
  }, [onCommentChange]);

  const aActive = value === options.a;
  const bActive = value === options.b;
  const cActive = !!options.c && value === options.c;
  const dActive = !!options.d && value === options.d;

  return (
    <View style={styles.container}>
      <View style={[styles.row, expanded && styles.rowExpanded]}>
        {/* Number badge */}
        <View style={styles.numBadge}>
          <Text style={styles.numText}>{id}</Text>
        </View>

        {/* Label + description */}
        <View style={styles.desc}>
          <Text style={styles.labelText}>{label}</Text>
          {!!description && <Text style={styles.descText}>{description}</Text>}
        </View>

        {/* Chips — monochrome: active = ink, inactive = neutral. Icon per role carries meaning. */}
        <View style={styles.chips}>
          {/* A — good / yes / pass */}
          <Pressable
            style={[styles.chip, aActive && styles.chipActive]}
            onPress={() => setChip(options.a)}
            hitSlop={8}
            {...a11y(options.a, `✓ ${options.a}`, 'button', { selected: aActive })}
          >
            <Ionicons
              name="checkmark"
              size={14}
              color={aActive ? theme.colors.ink : theme.colors.inkFaint}
            />
          </Pressable>

          {/* B — deficient/fix, fail (binary), or critical (four_state) */}
          <Pressable
            style={[styles.chip, bActive && styles.chipActive]}
            onPress={() => setChip(options.b)}
            hitSlop={8}
            {...a11y(options.b, `✗ ${options.b}`, 'button', { selected: bActive })}
          >
            {isFourState ? (
              <Text style={[styles.chipNAText, bActive && styles.chipNATextActive]}>
                {options.b}
              </Text>
            ) : (
              <Ionicons
                name={isBinary ? 'close' : 'warning-outline'}
                size={isBinary ? 14 : 13}
                color={bActive ? theme.colors.ink : theme.colors.inkFaint}
              />
            )}
          </Pressable>

          {/* C — third option (three_state) or minor (four_state) */}
          {!isBinary && !!options.c && (
            <Pressable
              style={[styles.chip, cActive && styles.chipActive]}
              onPress={() => setChip(options.c!)}
              hitSlop={8}
              {...a11y(options.c, `Z ${options.c}`, 'button', { selected: cActive })}
            >
              {isFourState ? (
                <Text style={[styles.chipNAText, cActive && styles.chipNATextActive]}>
                  {options.c}
                </Text>
              ) : cIsNeutral ? (
                <Text style={[styles.chipNAText, cActive && styles.chipNATextActive]}>
                  {options.c!.length <= 3 ? options.c : 'N/A'}
                </Text>
              ) : (
                <Ionicons
                  name="close"
                  size={14}
                  color={cActive ? theme.colors.ink : theme.colors.inkFaint}
                />
              )}
            </Pressable>
          )}

          {/* D — optional 4th chip (four_state only, "not checked") */}
          {isFourState && !!options.d && (
            <Pressable
              style={[styles.chip, dActive && styles.chipActive]}
              onPress={() => setChip(options.d!)}
              hitSlop={8}
              {...a11y(options.d, `N ${options.d}`, 'button', { selected: dActive })}
            >
              <Text style={[styles.chipNAText, dActive && styles.chipNATextActive]}>
                {options.d}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Accordion — comment + photos */}
      {expanded && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(100)}
          style={[styles.accordion, styles.accordionNeutral]}
        >
          {onCommentChange && (
            <FloatingLabelInput
              label="ხარვეზის აღწერა"
              value={commentDraft}
              onChangeText={handleCommentChange}
              multiline
              numberOfLines={2}
            />
          )}

          {(onAddPhoto || photoPaths.length > 0) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoStrip}
            >
              {photoPaths.map(path => (
                <PhotoThumb
                  key={path}
                  path={path}
                  onDelete={() => onDeletePhoto?.(path)}
                />
              ))}
              {onAddPhoto && (
                <Pressable
                  style={styles.addPhoto}
                  onPress={onAddPhoto}
                  {...a11y('ფოტოს დამატება', 'ფოტოს გადაღება ან ბიბლიოთეკიდან', 'button')}
                >
                  <Ionicons name="camera-outline" size={20} color={theme.colors.inkSoft} />
                  <Text style={styles.addPhotoLabel}>+ ფოტო</Text>
                </Pressable>
              )}
            </ScrollView>
          )}
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
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, path)
      .then(u => { if (!cancelled) setUri(u); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path]);

  return (
    <View style={styles.thumb}>
      <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" transition={200} />
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
    container: { marginBottom: 1 },
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
    numText: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft },
    desc: { flex: 1, gap: 2 },
    labelText: { fontSize: 12, fontWeight: '700', color: theme.colors.ink },
    descText: { fontSize: 11, color: theme.colors.inkSoft, lineHeight: 15 },
    chips: { flexDirection: 'row', gap: 4, paddingTop: 2 },
    // Monochrome chip: neutral by default, ink when selected.
    chip: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chipActive: {
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.subtleSurface,
    },
    chipNAText: { fontSize: 8, fontWeight: '700', color: theme.colors.inkSoft },
    chipNATextActive: { color: theme.colors.ink },
    // Accordion base + neutral fill
    accordion: {
      padding: 12,
      gap: 10,
      borderWidth: 1,
      borderTopWidth: 0,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
    },
    accordionNeutral: {
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.subtleSurface,
    },
    // Photos
    photoStrip: { gap: 8, paddingVertical: 2 },
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
    addPhotoLabel: { fontSize: 11, color: theme.colors.inkSoft },
    thumb: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
    thumbImg: { width: 64, height: 64 },
    thumbDelete: { position: 'absolute', top: 2, right: 2 },
  });
}
