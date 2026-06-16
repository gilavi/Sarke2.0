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
import type { CPResult, CPItemState, CPChecklistEntry } from '../../types/cargoPlatform';

interface Props {
  entry: CPChecklistEntry;
  state: CPItemState;
  onChange: (patch: Partial<Pick<CPItemState, 'result' | 'comment'>>) => void;
  onAddPhoto: () => void;
  onDeletePhoto: (path: string) => void;
}

export const CargoPlatformChecklistItem = memo(function CargoPlatformChecklistItem({
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

  // Only 'fix' opens the accordion; 'na' is just a marked chip, no input needed
  const expanded = state.result === 'fix';

  const setResult = useCallback((r: CPResult) => {
    haptic.light();
    if (state.result === r) {
      onChange({ result: null, comment: null });
      setCommentDraft('');
    } else {
      // Clear comment when switching away from fix
      const comment = r === 'fix' ? (state.comment ?? null) : null;
      onChange({ result: r, comment });
      if (r !== 'fix') setCommentDraft('');
    }
  }, [state.result, state.comment, onChange]);

  const handleCommentChange = useCallback((text: string) => {
    setCommentDraft(text);
    onChange({ comment: text || null });
  }, [onChange]);

  const goodActive = state.result === 'good';
  const fixActive  = state.result === 'fix';
  const naActive   = state.result === 'na';

  return (
    <View style={styles.container}>
      <View style={[styles.row, expanded && styles.rowExpanded]}>
        <View style={styles.numBadge}>
          <Text style={styles.numText}>{entry.id}</Text>
        </View>

        <View style={styles.desc}>
          <Text style={styles.labelText}>{entry.label}</Text>
          <Text style={styles.descText}>{entry.description}</Text>
        </View>

        <View style={styles.chips}>
          {/* ✓ კარგი */}
          <Pressable
            style={[styles.chip, styles.chipGood, goodActive && styles.chipGoodActive]}
            onPress={() => setResult('good')}
            hitSlop={8}
            {...a11y('კარგი', '✓ კარგი', 'button', { selected: goodActive })}
          >
            <Ionicons name="checkmark" size={14} color={goodActive ? theme.colors.ink : theme.colors.inkFaint} />
          </Pressable>

          {/* ⚠ გამოსასწ. */}
          <Pressable
            style={[styles.chip, styles.chipFix, fixActive && styles.chipFixActive]}
            onPress={() => setResult('fix')}
            hitSlop={8}
            {...a11y('გამოსასწ.', '⚠ გამოსასწორებელი', 'button', { selected: fixActive })}
          >
            <Ionicons name="warning-outline" size={13} color={fixActive ? theme.colors.ink : theme.colors.inkFaint} />
          </Pressable>

          {/* N/A */}
          <Pressable
            style={[styles.chip, styles.chipNA, naActive && styles.chipNAActive]}
            onPress={() => setResult('na')}
            hitSlop={8}
            {...a11y('N/A', 'არ ვრცელდება', 'button', { selected: naActive })}
          >
            <Text style={[styles.chipNAText, naActive && styles.chipNATextActive]}>N/A</Text>
          </Pressable>
        </View>
      </View>

      {/* Accordion — opens only for 'fix'; amber background (fixable, not rejected) */}
      {expanded && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(100)}
          style={[styles.accordion]}
        >
          <FloatingLabelInput
            label="ხარვეზის აღწერა"
            value={commentDraft}
            onChangeText={handleCommentChange}
            multiline
            numberOfLines={2}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {state.photo_paths.map(path => (
              <PhotoThumb key={path} path={path} onDelete={() => onDeletePhoto(path)} />
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

const PhotoThumb = memo(function PhotoThumb({ path, onDelete }: { path: string; onDelete: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const [uri, setUri] = useState('');

  useEffect(() => {
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, path).then(setUri).catch(() => {});
  }, [path]);

  return (
    <View style={styles.thumb}>
      <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" />
      <Pressable style={styles.thumbDelete} onPress={onDelete} hitSlop={8} {...a11y('ფოტოს წაშლა', undefined, 'button')}>
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
      flexDirection: 'row', alignItems: 'flex-start',
      paddingHorizontal: 12, paddingVertical: 10, gap: 8,
      backgroundColor: theme.colors.card,
      borderRadius: 10, borderWidth: 1, borderColor: theme.colors.hairline,
    },
    rowExpanded: {
      borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0,
    },
    numBadge: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    numText: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft },
    desc: { flex: 1, gap: 2 },
    labelText: { fontSize: 12, fontWeight: '700', color: theme.colors.ink },
    descText: { fontSize: 11, color: theme.colors.inkSoft, lineHeight: 15 },
    chips: { flexDirection: 'row', gap: 4, paddingTop: 2 },
    chip: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

    // Good — monochrome (icon carries the meaning)
    chipGood: { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    chipGoodActive: { borderColor: theme.colors.ink, backgroundColor: theme.colors.subtleSurface },

    // Fix — monochrome
    chipFix: { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    chipFixActive: { borderColor: theme.colors.ink, backgroundColor: theme.colors.subtleSurface },

    // N/A — monochrome
    chipNA: { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
    chipNAActive: { borderColor: theme.colors.ink, backgroundColor: theme.colors.subtleSurface },
    chipNAText: { fontSize: 8, fontWeight: '700', color: theme.colors.inkFaint },
    chipNATextActive: { color: theme.colors.ink },

    // Accordion — neutral tint
    accordion: {
      padding: 12, gap: 10,
      borderWidth: 1, borderTopWidth: 0,
      borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.subtleSurface,
    },

    photoStrip: { gap: 8, paddingVertical: 2 },
    addPhoto: {
      width: 64, height: 64, borderRadius: 8,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.hairline,
      alignItems: 'center', justifyContent: 'center', gap: 2,
    },
    addPhotoLabel: { fontSize: 11, color: theme.colors.inkSoft },
    thumb: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
    thumbImg: { width: 64, height: 64 },
    thumbDelete: { position: 'absolute', top: 2, right: 2 },
  });
}
