import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  InputAccessoryView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
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
  const [noteOpen, setNoteOpen] = useState(false);

  // Re-sync comment draft when parent state changes externally (server sync, etc.)
  useEffect(() => {
    setCommentDraft(state.comment ?? '');
  }, [state.comment]);

  const unusableLabel = catalog.unusableLabel ?? 'გამოუსადეგ.';
  const unusableIsNeutral = catalog.unusableIsNeutral === true;
  const showUnusable = true;

  const setResult = useCallback((r: NonNullable<ChecklistItemState['result']>) => {
    haptic.light();
    if (state.result === r) {
      onChange({ result: null, comment: null });
      setCommentDraft('');
      setNoteOpen(false);
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
  const showComment = hasProblem || noteOpen || !!state.comment;

  const accessoryId = Platform.OS === 'ios' ? 'checklist-comment-accessory' : undefined;

  return (
    <KeyboardAwareScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      bounces={false}
      showsVerticalScrollIndicator={false}
      bottomOffset={100}
    >
      {/* Progress indicator */}
      <Text style={styles.progressText}>
        პუნქტი {index + 1} / {total}
      </Text>

      {/* Centered icon */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.colors.accentSoft }]}>
          <Ionicons name="document-text-outline" size={32} color={theme.colors.accent} />
        </View>
      </View>

      {/* Title & description */}
      <View style={styles.titleWrap}>
        <Text style={styles.label}>{catalog.label}</Text>
        {catalog.description ? (
          <Text style={styles.description}>{catalog.description}</Text>
        ) : null}
      </View>

      {/* Assist chips — photo + note */}
      <View style={styles.chipRow}>
        <Pressable style={styles.assistChip} onPress={onAddPhoto}>
          <Ionicons name="camera-outline" size={18} color={theme.colors.inkSoft} />
          <Text style={styles.assistChipText}>ფოტო</Text>
        </Pressable>
        <Pressable
          style={styles.assistChip}
          onPress={() => setNoteOpen(v => !v)}
        >
          <Ionicons name="create-outline" size={18} color={theme.colors.inkSoft} />
          <Text style={styles.assistChipText}>შენიშვნა</Text>
        </Pressable>
        {onHelp ? (
          <Pressable style={styles.assistChip} onPress={onHelp}>
            <Ionicons name="help-circle-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={styles.assistChipText}>დახმარება</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Photo strip */}
      {state.photo_paths.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
          keyboardShouldPersistTaps="handled"
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
      )}

      {/* Choice buttons — Good & Deficient side by side */}
      <View style={styles.choiceRow}>
        <Pressable
          style={[styles.choice, styles.choiceGood, goodActive && styles.choiceGoodActive]}
          onPress={() => setResult('good')}
          {...a11y('გამართულია', '✓ გამართულია — შემდეგ პუნქტზე გადასვლა', 'button')}
        >
          <Ionicons
            name="checkmark"
            size={24}
            color={goodActive ? '#fff' : theme.colors.semantic.success}
          />
          <Text style={[styles.choiceText, goodActive && styles.choiceTextActive]}>
            გამართულია
          </Text>
        </Pressable>

        <Pressable
          style={[styles.choice, styles.choiceDef, defActive && styles.choiceDefActive]}
          onPress={() => setResult('deficient')}
          {...a11y('ხარვეზია', '⚠ ხარვეზია — კომენტარის და ფოტოს დამატება', 'button')}
        >
          <Ionicons
            name="warning"
            size={24}
            color={defActive ? '#fff' : theme.colors.warn}
          />
          <Text style={[styles.choiceText, defActive && styles.choiceTextActive]}>
            ხარვეზია
          </Text>
        </Pressable>
      </View>

      {/* Unusable / Not present */}
      {showUnusable && (
        <Pressable
          style={[
            styles.unusableBtn,
            unusableIsNeutral ? styles.unusableNeutral : styles.unusableBad,
            unusableActive && (unusableIsNeutral ? styles.unusableNeutralActive : styles.unusableBadActive),
          ]}
          onPress={() => setResult('unusable')}
          {...a11y(unusableLabel, `✕ ${unusableLabel}`, 'button')}
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
              styles.unusableText,
              unusableActive && styles.unusableTextActive,
              !unusableActive && unusableIsNeutral && { color: theme.colors.inkSoft },
              !unusableActive && !unusableIsNeutral && { color: theme.colors.danger },
            ]}
          >
            {unusableLabel}
          </Text>
        </Pressable>
      )}

      {/* Comment input */}
      {showComment && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(180)}
          exiting={reduceMotion ? undefined : FadeOut.duration(100)}
          style={styles.commentWrap}
        >
          <FloatingLabelInput
            label="ხარვეზის აღწერა"
            value={commentDraft}
            onChangeText={handleCommentChange}
            multiline
            numberOfLines={3}
            inputAccessoryViewID={accessoryId}
          />
        </Animated.View>
      )}

      {/* iOS Input Accessory View for comment field */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={[styles.accessoryBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.hairline }]}>
            <Pressable
              onPress={() => {
                KeyboardController.dismiss();
              }}
              style={styles.accessoryBtn}
            >
              <Text style={[styles.accessoryBtnText, { color: theme.colors.accent }]}>მზადაა</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </KeyboardAwareScrollView>
  );
});

// �"?�"? Bounded photo URL cache (mirrors generic wizard pattern) �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

const PHOTO_URL_CACHE_MAX = 100;
const photoUrlCache = new Map<string, string>();

function setPhotoUrlCache(key: string, url: string) {
  if (photoUrlCache.has(key)) photoUrlCache.delete(key);
  photoUrlCache.set(key, url);
  if (photoUrlCache.size > PHOTO_URL_CACHE_MAX) {
    const oldest = photoUrlCache.keys().next().value;
    if (oldest !== undefined) photoUrlCache.delete(oldest);
  }
}

// �"?�"? Photo thumbnail �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

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
    const cacheKey = `${STORAGE_BUCKETS.answerPhotos}:${path}`;
    if (photoUrlCache.has(cacheKey)) {
      setUri(photoUrlCache.get(cacheKey)!);
      return;
    }
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, path)
      .then(url => {
        if (!cancelled) {
          setPhotoUrlCache(cacheKey, url);
          setUri(url);
        }
      })
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

// �"?�"? Styles �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

function getstyles(theme: Theme) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 24,
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
      textAlign: 'center',
    },
    avatarWrap: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    avatarCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleWrap: {
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    label: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.ink,
      lineHeight: 32,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
    description: {
      fontSize: 15,
      color: theme.colors.inkSoft,
      lineHeight: 22,
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
      paddingTop: 4,
    },
    assistChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    assistChipText: {
      fontSize: 16,
      color: theme.colors.inkSoft,
      fontWeight: '500',
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
    choiceRow: {
      flexDirection: 'row',
      gap: 12,
      paddingTop: 8,
    },
    choice: {
      flex: 1,
      minHeight: 92,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    choiceGood: {
      borderColor: theme.colors.semantic.success,
      backgroundColor: theme.colors.semantic.successSoft,
    },
    choiceGoodActive: {
      backgroundColor: theme.colors.semantic.success,
      borderColor: theme.colors.semantic.success,
    },
    choiceDef: {
      borderColor: theme.colors.warn,
      backgroundColor: theme.colors.warnSoft,
    },
    choiceDefActive: {
      backgroundColor: theme.colors.warn,
      borderColor: theme.colors.warn,
    },
    choiceText: {
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    choiceTextActive: {
      color: '#fff',
    },
    unusableBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1.5,
      alignSelf: 'center',
      paddingHorizontal: 24,
      marginTop: 4,
    },
    unusableNeutral: {
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.subtleSurface,
    },
    unusableBad: {
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
    },
    unusableNeutralActive: {
      backgroundColor: theme.colors.inkSoft,
      borderColor: theme.colors.inkSoft,
    },
    unusableBadActive: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
    },
    unusableText: {
      fontSize: 14,
      fontWeight: '600',
    },
    unusableTextActive: {
      color: '#fff',
    },
    commentWrap: {
      marginTop: 4,
    },
    accessoryBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    accessoryBtn: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    accessoryBtnText: {
      fontSize: 15,
      fontWeight: '600',
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
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 10,
      padding: 2,
    },
  });
}
