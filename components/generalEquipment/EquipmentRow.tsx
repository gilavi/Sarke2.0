import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { SuggestionPills } from '../SuggestionPills';
import { useFieldHistory } from '../../hooks/useFieldHistory';
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
  userId?: string | null;
  onChange: (patch: Partial<EquipmentItem>) => void;
  onDelete: () => void;
  onAddPhoto: () => void;
  onDeletePhoto: (path: string) => void;
}

export const EquipmentRow = memo(function EquipmentRow({
  index,
  item,
  canDelete,
  userId = null,
  onChange,
  onDelete,
  onAddPhoto,
  onDeletePhoto,
}: Props) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const nameHistory = useFieldHistory(userId, 'ge:equipmentName');
  const modelHistory = useFieldHistory(userId, 'ge:equipmentModel');
  const serialHistory = useFieldHistory(userId, 'ge:equipmentSerial');

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
          onFocus={() => setFocusedField('name')}
          onBlur={() => {
            setFocusedField(null);
            if (nameDraft.trim()) nameHistory.addToHistory(nameDraft.trim());
          }}
        />
        <SuggestionPills
          suggestions={nameHistory.suggestions}
          onSelect={v => {
            setNameDraft(v);
            onChange({ name: v });
            setFocusedField(null);
          }}
          visible={focusedField === 'name' || (!nameDraft.trim() && nameHistory.suggestions.length > 0)}
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
              onFocus={() => setFocusedField('model')}
              onBlur={() => {
                setFocusedField(null);
                if (modelDraft.trim()) modelHistory.addToHistory(modelDraft.trim());
              }}
            />
            <SuggestionPills
              suggestions={modelHistory.suggestions}
              onSelect={v => {
                setModelDraft(v);
                onChange({ model: v });
                setFocusedField(null);
              }}
              visible={focusedField === 'model' || (!modelDraft.trim() && modelHistory.suggestions.length > 0)}
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
              onFocus={() => setFocusedField('serial')}
              onBlur={() => {
                setFocusedField(null);
                if (serialDraft.trim()) serialHistory.addToHistory(serialDraft.trim());
              }}
            />
            <SuggestionPills
              suggestions={serialHistory.suggestions}
              onSelect={v => {
                setSerialDraft(v);
                onChange({ serialNumber: v });
                setFocusedField(null);
              }}
              visible={focusedField === 'serial' || (!serialDraft.trim() && serialHistory.suggestions.length > 0)}
            />
          </View>
        </View>

        {/* Condition chips */}
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, goodActive ? styles.chipGoodActive : styles.chipGood]}
            onPress={() => setCondition('good')}
            hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
            {...a11y('კარგი', '✓ კარგია', 'button')}
          >
            <Ionicons name="checkmark" size={13} color={goodActive ? theme.colors.white : theme.colors.semantic.success} />
            <Text style={[styles.chipLabel, goodActive ? styles.chipLabelGoodActive : styles.chipLabelGood]}>კარგი</Text>
          </Pressable>

          <Pressable
            style={[styles.chip, warnActive ? styles.chipWarnActive : styles.chipWarn]}
            onPress={() => setCondition('needs_service')}
            hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
            {...a11y('საჭ. მომსახ.', '⚠ საჭ. მომსახ.', 'button')}
          >
            <Ionicons name="warning-outline" size={12} color={warnActive ? theme.colors.white : theme.colors.warn} />
            <Text style={[styles.chipLabel, warnActive ? styles.chipLabelWarnActive : styles.chipLabelWarn]}>საჭ. მომს.</Text>
          </Pressable>

          <Pressable
            style={[styles.chip, badActive ? styles.chipBadActive : styles.chipBad]}
            onPress={() => setCondition('unusable')}
            hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
            {...a11y('გამოუსადეგ.', '✗ გამოუსადეგარია', 'button')}
          >
            <Ionicons name="close" size={13} color={badActive ? theme.colors.white : theme.colors.danger} />
            <Text style={[styles.chipLabel, badActive ? styles.chipLabelBadActive : styles.chipLabelBad]}>გამოუსადეგ.</Text>
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
      paddingVertical: 10, paddingHorizontal: 4,
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    cardExpanded: {
      borderBottomWidth: 0,
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

    chipGood:       { borderColor: theme.colors.semantic.success },
    chipGoodActive: { backgroundColor: theme.colors.semantic.success, borderColor: theme.colors.semantic.success },
    chipLabelGoodActive: { color: theme.colors.white },

    chipWarn:       { borderColor: theme.colors.warn },
    chipWarnActive: { backgroundColor: theme.colors.warn, borderColor: theme.colors.warn },
    chipLabelWarnActive: { color: theme.colors.white },

    chipBad:       { borderColor: theme.colors.danger },
    chipBadActive: { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },
    chipLabelBadActive: { color: theme.colors.white },

    chipLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.inkSoft },
    chipLabelGood:   { color: theme.colors.semantic.success },
    chipLabelWarn:   { color: theme.colors.warn },
    chipLabelBad:    { color: theme.colors.danger },

    accordion: {
      padding: 12, gap: 10, borderTopWidth: 0,
    },
    accordionWarn: { borderColor: theme.colors.warn },
    accordionBad:  { borderColor: theme.colors.dangerBorder },

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
