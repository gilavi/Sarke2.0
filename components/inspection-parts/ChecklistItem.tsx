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

  // Accordion style:
  //   four_state: b → red, c → amber
  //   three_state: b → amber, c neutral → gray, c non-neutral → red
  const accordionStyle = useMemo(() => {
    if (isFourState) {
      if (value === options.b) return styles.accordionBad;
      if (value === options.c) return styles.accordionDef;
      return styles.accordionNeutral;
    }
    if (value === options.b) return styles.accordionDef;
    if (value === options.c && cIsNeutral) return styles.accordionNeutral;
    return styles.accordionBad;
  }, [isFourState, value, options.b, options.c, cIsNeutral, styles]);

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

        {/* Chips */}
        <View style={styles.chips}>
          {/* A — green (good / yes / pass) */}
          <Pressable
            style={[styles.chip, styles.chipGood, aActive && styles.chipGoodActive]}
            onPress={() => setChip(options.a)}
            hitSlop={8}
            {...a11y(options.a, `✓ ${options.a}`, 'button')}
          >
            <Ionicons
              name="checkmark"
              size={14}
              color={aActive ? theme.colors.white : theme.colors.semantic.success}
            />
          </Pressable>

          {/* B — amber (deficient/fix), red (binary), or red critical (four_state) */}
          <Pressable
            style={[
              styles.chip,
              isFourState || isBinary ? styles.chipBad : styles.chipDef,
              bActive && (isFourState || isBinary ? styles.chipBadActive : styles.chipDefActive),
            ]}
            onPress={() => setChip(options.b)}
            hitSlop={8}
            {...a11y(options.b, `✗ ${options.b}`, 'button')}
          >
            {isFourState ? (
              <Text style={[styles.chipNAText, bActive && { color: theme.colors.white }]}>
                {options.b}
              </Text>
            ) : (
              <Ionicons
                name={isBinary ? 'close' : 'warning-outline'}
                size={isBinary ? 14 : 13}
                color={
                  bActive
                    ? theme.colors.white
                    : isBinary
                    ? theme.colors.danger
                    : theme.colors.warn
                }
              />
            )}
          </Pressable>

          {/* C — neutral/red (three_state) or amber minor (four_state) */}
          {!isBinary && !!options.c && (
            <Pressable
              style={[
                styles.chip,
                isFourState
                  ? styles.chipDef
                  : cIsNeutral
                  ? styles.chipNA
                  : styles.chipBad,
                cActive &&
                  (isFourState
                    ? styles.chipDefActive
                    : cIsNeutral
                    ? styles.chipNAActive
                    : styles.chipBadActive),
              ]}
              onPress={() => setChip(options.c!)}
              hitSlop={8}
              {...a11y(options.c, `Z ${options.c}`, 'button')}
            >
              {isFourState ? (
                <Text
                  style={[
                    styles.chipNAText,
                    { color: cActive ? theme.colors.white : theme.colors.warn },
                  ]}
                >
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
                  color={cActive ? theme.colors.white : theme.colors.danger}
                />
              )}
            </Pressable>
          )}

          {/* D — optional 4th chip (four_state only, neutral gray "not checked") */}
          {isFourState && !!options.d && (
            <Pressable
              style={[styles.chip, styles.chipNA, dActive && styles.chipNAActive]}
              onPress={() => setChip(options.d!)}
              hitSlop={8}
              {...a11y(options.d, `N ${options.d}`, 'button')}
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
          style={[styles.accordion, accordionStyle]}
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
    chip: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    // A — green
    chipGood: {
      borderColor: theme.colors.semantic.success,
      backgroundColor: theme.colors.semantic.successSoft,
    },
    chipGoodActive: { backgroundColor: theme.colors.semantic.success },
    // B — amber (deficient/fix) or red (fail in binary)
    chipDef: {
      borderColor: theme.colors.warn,
      backgroundColor: theme.colors.warnSoft,
    },
    chipDefActive: { backgroundColor: theme.colors.warn },
    // C non-neutral — red
    chipBad: {
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
    },
    chipBadActive: { backgroundColor: theme.colors.danger },
    // C neutral — gray
    chipNA: {
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.subtleSurface,
    },
    chipNAActive: { backgroundColor: theme.colors.inkSoft, borderColor: theme.colors.inkSoft },
    chipNAText: { fontSize: 8, fontWeight: '700', color: theme.colors.inkSoft },
    chipNATextActive: { color: theme.colors.white },
    // Accordion bases
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
    accordionNeutral: {
      borderColor: theme.colors.hairline,
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
