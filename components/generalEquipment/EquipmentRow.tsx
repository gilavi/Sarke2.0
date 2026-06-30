import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Camera, Check, CircleX, Trash2, TriangleAlert, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
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

/**
 * Report-style equipment card for the general-equipment inspection wizard.
 *
 * Each card reads like a mini-report rather than a questionnaire row:
 * an editable name, a monochrome status toggle (good / needs-service /
 * unusable), and — only once a row is flagged as needs-service or unusable —
 * an accordion that reveals a photo strip and a comment field (image first,
 * then comment). "Good" rows stay collapsed to a single clean line.
 *
 * Photo upload/delete and all field writes are delegated to the parent route
 * via the `onChange` / `onAddPhoto` / `onDeletePhoto` callbacks; this component
 * holds only local input drafts.
 */
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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const nameHistory = useFieldHistory(userId, 'ge:equipmentName');

  const [nameDraft, setNameDraft] = useState(item.name);
  const [noteDraft, setNoteDraft] = useState(item.note ?? '');

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
              {...a11y(t('generalEquipment.deleteRow'), undefined, 'button')}
            >
              <Trash2 size={16} color={theme.colors.danger} strokeWidth={1.5} />
            </Pressable>
          )}
        </View>

        {/* Name field */}
        <FloatingLabelInput
          label={t('generalEquipment.nameLabel') + ' *'}
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

        {/* Condition chips */}
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, goodActive ? styles.chipGoodActive : styles.chipGood]}
            onPress={() => setCondition('good')}
            hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
            {...a11y(t('generalEquipment.conditionGood'), t('generalEquipment.conditionGoodA11y'), 'button', { selected: goodActive })}
          >
            <Check size={13} color={goodActive ? theme.colors.ink : theme.colors.inkFaint} strokeWidth={1.5} />
            <Text style={[styles.chipLabel, goodActive ? styles.chipLabelGoodActive : styles.chipLabelGood]}>{t('generalEquipment.conditionGood')}</Text>
          </Pressable>

          <Pressable
            style={[styles.chip, warnActive ? styles.chipWarnActive : styles.chipWarn]}
            onPress={() => setCondition('needs_service')}
            hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
            {...a11y(t('generalEquipment.conditionService'), t('generalEquipment.conditionServiceFull'), 'button', { selected: warnActive })}
          >
            <TriangleAlert size={12} color={warnActive ? theme.colors.ink : theme.colors.inkFaint} strokeWidth={1.5} />
            <Text style={[styles.chipLabel, warnActive ? styles.chipLabelWarnActive : styles.chipLabelWarn]}>{t('generalEquipment.conditionService')}</Text>
          </Pressable>

          <Pressable
            style={[styles.chip, badActive ? styles.chipBadActive : styles.chipBad]}
            onPress={() => setCondition('unusable')}
            hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
            {...a11y(t('generalEquipment.conditionUnusable'), t('generalEquipment.conditionUnusableFull'), 'button', { selected: badActive })}
          >
            <X size={13} color={badActive ? theme.colors.ink : theme.colors.inkFaint} strokeWidth={1.5} />
            <Text style={[styles.chipLabel, badActive ? styles.chipLabelBadActive : styles.chipLabelBad]}>{t('generalEquipment.conditionUnusable')}</Text>
          </Pressable>
        </View>
      </View>

      {/* Accordion: photos first, then comment (image → comment, report style) */}
      {expanded && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(100)}
          style={[styles.accordion, accordionStyle]}
        >
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
              {...a11y(t('generalEquipment.addPhotoA11y'), t('generalEquipment.addPhotoHint'), 'button')}
            >
              <Camera size={20} color={theme.colors.inkSoft} strokeWidth={1.5} />
              <Text style={styles.addPhotoLabel}>{t('generalEquipment.addPhoto')}</Text>
            </Pressable>
          </ScrollView>

          <FloatingLabelInput
            label={t('generalEquipment.noteLabel') + ' *'}
            value={noteDraft}
            onChangeText={text => {
              setNoteDraft(text);
              onChange({ note: text || null });
            }}
            multiline
            numberOfLines={2}
          />
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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const [uri, setUri] = useState('');

  useEffect(() => {
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, path).then(setUri).catch(() => {});
  }, [path]);

  return (
    <View style={styles.thumb}>
      <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" transition={200} />
      <Pressable style={styles.thumbDelete} onPress={onDelete} hitSlop={8} {...a11y(t('generalEquipment.deletePhotoA11y'), undefined, 'button')}>
        <CircleX size={18} color={theme.colors.white} strokeWidth={1.5} />
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

    chips: { flexDirection: 'row', gap: 6 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5,
      backgroundColor: theme.colors.surface,
    },

    chipGood:       { borderColor: theme.colors.border },
    chipGoodActive: { backgroundColor: theme.colors.subtleSurface, borderColor: theme.colors.ink },
    chipLabelGoodActive: { color: theme.colors.ink },

    chipWarn:       { borderColor: theme.colors.border },
    chipWarnActive: { backgroundColor: theme.colors.subtleSurface, borderColor: theme.colors.ink },
    chipLabelWarnActive: { color: theme.colors.ink },

    chipBad:       { borderColor: theme.colors.border },
    chipBadActive: { backgroundColor: theme.colors.subtleSurface, borderColor: theme.colors.ink },
    chipLabelBadActive: { color: theme.colors.ink },

    chipLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.inkSoft },
    chipLabelGood:   { color: theme.colors.inkSoft },
    chipLabelWarn:   { color: theme.colors.inkSoft },
    chipLabelBad:    { color: theme.colors.inkSoft },

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
