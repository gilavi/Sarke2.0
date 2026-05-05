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
import type { EquipmentItem, GECondition } from '../../types/generalEquipment';

interface Props {
  index: number;
  item: EquipmentItem;
  canDelete: boolean;
  onChange: (patch: Partial<EquipmentItem>) => void;
  onDelete: () => void;
  onAddPhoto: () => void;
  onDeletePhoto: (path: string) => void;
}

export const EquipmentRow = memo(function EquipmentRow({
  index,
  item,
  canDelete,
  onChange,
  onDelete,
  onAddPhoto,
  onDeletePhoto,
}: Props) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [nameDraft,   setNameDraft]   = useState(item.name);
  const [modelDraft,  setModelDraft]  = useState(item.model);
  const [serialDraft, setSerialDraft] = useState(item.serialNumber);
  const [noteDraft,   setNoteDraft]   = useState(item.note ?? '');

  const expanded = item.condition === 'needs_service' || item.condition === 'unusable';

  const setCondition = useCallback((c: GECondition) => {
    haptic.light();
    onChange({ condition: item.condition === c ? null : c });
  }, [item.condition, onChange]);

  const goodActive = item.condition === 'good';
  const warnActive = item.condition === 'needs_service';
  const badActive  = item.condition === 'unusable';

  const accordionStyle = warnActive ? styles.accordionWarn : styles.accordionBad;

  return (
    <View style={styles.container}>
      <View style={[styles.card, expanded && styles.cardExpanded]}>
        {/* Row header: index badge + delete */}
        <View style={styles.topRow}>
          <View style={styles.numBadge}>
            <Text style={styles.numText}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }} />
          {canDelete && (
            <Pressable
              style={styles.deleteBtn}
              onPress={onDelete}
              hitSlop={10}
              {...a11y('სტრიქონის წაშლა', undefined, 'button')}
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
            </Pressable>
          )}
        </View>

        {/* Name field */}
        <FloatingLabelInput
          label="დასახელება *"
          value={nameDraft}
          onChangeText={text => {
            setNameDraft(text);
            onChange({ name: text });
          }}
        />

        {/* Model + Serial — 2 columns */}
        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <FloatingLabelInput
              label="მარკა / მოდელი"
              value={modelDraft}
              onChangeText={text => {
                setModelDraft(text);
                onChange({ model: text });
              }}
            />
          </View>
          <View style={styles.colHalf}>
            <FloatingLabelInput
              label="სერ. ნომერი"
              value={serialDraft}
              onChangeText={text => {
                setSerialDraft(text);
                onChange({ serialNumber: text });
              }}
            />
          </View>
        </View>

        {/* Condition chips */}
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, styles.chipGood, goodActive && styles.chipGoodActive]}
            onPress={() => setCondition('good')}
            hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
            {...a11y('კარგი', '✓ კარგია', 'button')}
          >
            <Ionicons name="checkmark" size={13} color={goodActive ? theme.colors.white : theme.colors.semantic.success} />
            <Text style={[styles.chipLabel, goodActive && styles.chipLabelGood]}>კარგი</Text>
          </Pressable>

          <Pressable
            style={[styles.chip, styles.chipWarn, warnActive && styles.chipWarnActive]}
            onPress={() => setCondition('needs_service')}
            hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
            {...a11y('საჭ. მომსახ.', '⚠ საჭ. მომსახ.', 'button')}
          >
            <Ionicons name="warning-outline" size={12} color={warnActive ? theme.colors.white : theme.colors.warn} />
            <Text style={[styles.chipLabel, warnActive && styles.chipLabelWarn]}>საჭ. მომს.</Text>
          </Pressable>

          <Pressable
            style={[styles.chip, styles.chipBad, badActive && styles.chipBadActive]}
            onPress={() => setCondition('unusable')}
            hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
            {...a11y('გამოუსადეგ.', '✗ გამოუსადეგარია', 'button')}
          >
            <Ionicons name="close" size={13} color={badActive ? theme.colors.white : theme.colors.danger} />
            <Text style={[styles.chipLabel, badActive && styles.chipLabelBad]}>გამოუსადეგ.</Text>
          </Pressable>
        </View>
      </View>

      {/* Accordion: note + photos */}
      {expanded && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(100)}
          style={[styles.accordion, accordionStyle]}
        >
          <FloatingLabelInput
            label="შენიშვნა *"
            value={noteDraft}
            onChangeText={text => {
              setNoteDraft(text);
              onChange({ note: text || null });
            }}
            multiline
            numberOfLines={2}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {item.photo_paths.map(path => (
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
      <Pressable style={styles.thumbDelete} onPress={onDelete} hitSlop={8} {...a11y('ფოტოს წაშლა', undefined, 'button')}>
        <Ionicons name="close-circle" size={18} color={theme.colors.white} />
      </Pressable>
    </View>
  );
});

function getstyles(theme: Theme) {
  return StyleSheet.create({
    container: { marginBottom: 8 },

    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 10, borderWidth: 1, borderColor: theme.colors.hairline,
      padding: 10, gap: 8,
    },
    cardExpanded: {
      borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0,
    },

    topRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    numBadge: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center', justifyContent: 'center',
    },
    numText: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft },

    deleteBtn: {
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: theme.colors.dangerTint,
      alignItems: 'center', justifyContent: 'center',
    },

    twoCol: { flexDirection: 'row', gap: 8 },
    colHalf: { flex: 1 },

    chips: { flexDirection: 'row', gap: 6 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5,
    },

    chipGood:       { borderColor: theme.colors.semantic.success, backgroundColor: theme.colors.semantic.successSoft },
    chipGoodActive: { backgroundColor: theme.colors.semantic.success, borderColor: theme.colors.semantic.success },
    chipLabelGood:  { color: theme.colors.white },

    chipWarn:       { borderColor: theme.colors.warn, backgroundColor: theme.colors.warnSoft },
    chipWarnActive: { backgroundColor: theme.colors.warn, borderColor: theme.colors.warn },
    chipLabelWarn:  { color: theme.colors.white },

    chipBad:       { borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerTint },
    chipBadActive: { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },
    chipLabelBad:  { color: theme.colors.white },

    chipLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.inkSoft },

    accordion: {
      padding: 12, gap: 10, borderWidth: 1, borderTopWidth: 0,
      borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    },
    accordionWarn: { borderColor: theme.colors.warn,        backgroundColor: theme.colors.warnSoft },
    accordionBad:  { borderColor: theme.colors.dangerBorder, backgroundColor: theme.colors.dangerTint },

    photoStrip:   { gap: 8, paddingVertical: 2 },
    addPhoto: {
      width: 64, height: 64, borderRadius: 8,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.hairline,
      alignItems: 'center', justifyContent: 'center', gap: 2,
    },
    addPhotoLabel: { fontSize: 11, color: theme.colors.inkSoft },
    thumb:       { width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
    thumbImg:    { width: 64, height: 64 },
    thumbDelete: { position: 'absolute', top: 2, right: 2 },
  });
}
