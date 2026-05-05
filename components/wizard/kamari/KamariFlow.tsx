// Kamari (ქამარი) inspection flow — three views:
//   1. KamariCount       — choose how many belts to inspect
//   2. KamariOverview    — grid of belt cards (green/amber/red), tap to drill in
//   3. KamariDetailModal — per-belt component checklist with accordions
//
// Data model: maps onto the existing harness component_grid Answer.grid_values
// shape so the results screen and PDF generation keep working unchanged.
//
//   grid_values['N{i}'][componentCol]            = 'bad' | undefined
//   grid_values['N{i}']['კომენტარი_{col}']       = description
//   answer_photos with caption "row:N{i}:col:{col}" (matches HarnessListFlow)

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../primitives/A11yText';
import { Button, Card } from '../../ui';
import { useTheme, type Theme } from '../../../lib/theme';
import { useAccessibilitySettings } from '../../../lib/accessibility';
import { FloatingLabelInput } from '../../inputs/FloatingLabelInput';

import { haptic } from '../../../lib/haptics';
import { imageForDisplay } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import type { Answer, AnswerPhoto, GridValues, Question } from '../../../types/models';

const BRAND_GREEN = '#1D9E75';
const COMMENT_PREFIX = 'კომენტარი_';

function rowKey(i: number) {
  return `N${i}`;
}

function captionFor(row: string, col: string) {
  return `row:${row}:col:${col}`;
}

function componentColsFor(question: Question): string[] {
  return (question.grid_cols ?? []).filter(c => c !== 'კომენტარი');
}

function maxRowsFor(question: Question): number {
  return question.grid_rows?.length ?? 15;
}

function badCountFor(answer: Answer | undefined, row: string, cols: string[]): number {
  const cells = answer?.grid_values?.[row];
  if (!cells) return 0;
  let n = 0;
  for (const col of cols) if (cells[col] === 'bad') n++;
  return n;
}

// ─────────────────────────── Step 1: Count ──────────────────────────────────

export const KamariCount = memo(function KamariCount({
  count,
  onChange,
  max,
}: {
  count: number;
  onChange: (n: number) => void;
  max: number;
}) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const dec = () => {
    if (count <= 1) return;
    haptic.light();
    onChange(count - 1);
  };
  const inc = () => {
    if (count >= max) return;
    haptic.light();
    onChange(count + 1);
  };
  return (
    <View style={styles.countWrap}>
      <Text size="2xl" weight="bold" style={styles.countTitle}>
        რამდენი ქამარია?
      </Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={dec}
          disabled={count <= 1}
          hitSlop={12}
          style={({ pressed }) => [pressed && { opacity: 0.6 }, count <= 1 && { opacity: 0.35 }]}
        >
          <Ionicons name="remove-circle" size={52} color={BRAND_GREEN} />
        </Pressable>
        <View style={styles.countNumberWrap}>
          <Text style={styles.countNumber}>{count}</Text>
        </View>
        <Pressable
          onPress={inc}
          disabled={count >= max}
          hitSlop={12}
          style={({ pressed }) => [pressed && { opacity: 0.6 }, count >= max && { opacity: 0.35 }]}
        >
          <Ionicons name="add-circle" size={52} color={BRAND_GREEN} />
        </Pressable>
      </View>
    </View>
  );
});

// ─────────────────────────── Step 2: Overview ───────────────────────────────

type CardState = 'ok' | 'inProgress' | 'problems';

export const KamariOverview = memo(function KamariOverview({
  question,
  answer,
  count,
  visited,
  onOpen,
}: {
  question: Question;
  answer: Answer | undefined;
  count: number;
  visited: Set<number>;
  onOpen: (index: number) => void;
}) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const cols = useMemo(() => componentColsFor(question), [question]);
  const indices = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  return (
    <ScrollView
      contentContainerStyle={styles.overviewContent}
      showsVerticalScrollIndicator={false}
    >
      <Text size="xl" weight="bold" style={{ marginBottom: 4 }}>
        ქამარების შემოწმება
      </Text>
      <Text size="sm" color={theme.colors.inkSoft} style={{ marginBottom: 16 }}>
        შეეხეთ ქამარის ბარათს დეტალების სანახავად
      </Text>
      <View style={styles.grid}>
        {indices.map(i => {
          const bad = badCountFor(answer, rowKey(i), cols);
          const state: CardState =
            bad > 0 ? 'problems' : visited.has(i) ? 'inProgress' : 'ok';
          return (
            <KamariCard
              key={i}
              index={i}
              state={state}
              problemCount={bad}
              onPress={() => onOpen(i)}
            />
          );
        })}
      </View>
    </ScrollView>
  );
});

const KamariCard = memo(function KamariCard({
  index,
  state,
  problemCount,
  onPress,
}: {
  index: number;
  state: CardState;
  problemCount: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const palette =
    state === 'problems'
      ? {
          bg: theme.colors.dangerSoft,
          border: theme.colors.danger,
          icon: 'alert-circle' as const,
          iconColor: theme.colors.danger,
          label: `${problemCount} პრობლემა`,
          labelColor: theme.colors.danger,
        }
      : state === 'inProgress'
        ? {
            bg: theme.colors.semantic.warningSoft,
            border: theme.colors.semantic.warning,
            icon: 'time-outline' as const,
            iconColor: theme.colors.semantic.warning,
            label: 'მიმდინარეობს',
            labelColor: theme.colors.semantic.warning,
          }
        : {
            bg: theme.colors.semantic.successSoft,
            border: theme.colors.semantic.success,
            icon: 'checkmark-circle' as const,
            iconColor: theme.colors.semantic.success,
            label: 'კარგია',
            labelColor: theme.colors.semantic.success,
          };
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text size="lg" weight="bold" style={{ marginBottom: 8 }}>
        ქამარი #{index}
      </Text>
      <Ionicons name={palette.icon} size={42} color={palette.iconColor} />
      <Text
        size="sm"
        weight="semibold"
        color={palette.labelColor}
        style={{ marginTop: 8 }}
      >
        {palette.label}
      </Text>
    </Pressable>
  );
});

// ─────────────────────────── Step 3: Detail Modal ───────────────────────────

type DraftItem = {
  description: string;
  active: boolean; // user marked this component as a problem
};

type Draft = Record<string, DraftItem>;

export function KamariDetailModal({
  visible,
  index,
  question,
  answer,
  photosByAnswer,
  onClose,
  onSave,
  onPickPhoto,
  onDeletePhoto,
}: {
  visible: boolean;
  index: number;
  question: Question;
  answer: Answer | undefined;
  photosByAnswer: Record<string, AnswerPhoto[]>;
  onClose: () => void;
  onSave: (next: GridValues) => void;
  onPickPhoto: (col: string) => void;
  onDeletePhoto: (photo: AnswerPhoto) => void;
}) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const insets = useSafeAreaInsets();
  const cols = useMemo(() => componentColsFor(question), [question]);
  const row = rowKey(index);

  const seedDraft = useCallback((): Draft => {
    const cells = answer?.grid_values?.[row] ?? {};
    const out: Draft = {};
    for (const col of cols) {
      const isBad = cells[col] === 'bad';
      const desc = (cells[`${COMMENT_PREFIX}${col}`] as string | undefined) ?? '';
      out[col] = { active: isBad, description: desc };
    }
    return out;
  }, [answer, cols, row]);

  const [draft, setDraft] = useState<Draft>(seedDraft);
  const [openCol, setOpenCol] = useState<string | null>(null);
  const initialDraftRef = useRef<Draft>(draft);

  // Re-seed every time the modal opens for a (potentially different) belt
  useEffect(() => {
    if (visible) {
      const seed = seedDraft();
      setDraft(seed);
      initialDraftRef.current = seed;
      setOpenCol(null);
    }
  }, [visible, seedDraft]);

  const isDirty = useMemo(() => {
    const a = initialDraftRef.current;
    if (Object.keys(a).length !== Object.keys(draft).length) return true;
    for (const col of Object.keys(draft)) {
      const x = a[col];
      const y = draft[col];
      if (!x || x.active !== y.active || x.description !== y.description) return true;
    }
    return false;
  }, [draft]);

  const requestClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    Alert.alert(
      'ცვლილებების გაუქმება?',
      'შენახვის გარეშე გასვლისას ცვლილებები დაიკარგება.',
      [
        { text: 'გაგრძელება', style: 'cancel' },
        {
          text: 'გასვლა',
          style: 'destructive',
          onPress: () => onClose(),
        },
      ],
    );
  };

  const toggleItem = (col: string) => {
    setOpenCol(prev => (prev === col ? null : col));
    setDraft(prev => {
      const cur = prev[col] ?? { active: false, description: '' };
      // Opening for the first time marks it active so it visibly turns red.
      // Toggling closed keeps active=true unless description is empty AND user
      // explicitly tapped close from the accordion (handled by closeItem).
      if (openCol === col) return prev;
      return { ...prev, [col]: { ...cur, active: true } };
    });
  };

  const closeItem = (col: string) => {
    setOpenCol(null);
    setDraft(prev => {
      const cur = prev[col];
      if (!cur) return prev;
      // If user closed without typing anything, revert to neutral.
      if (!cur.description.trim()) {
        return { ...prev, [col]: { active: false, description: '' } };
      }
      return prev;
    });
  };

  const setDescription = (col: string, value: string) => {
    setDraft(prev => ({
      ...prev,
      [col]: { active: true, description: value },
    }));
  };

  const handleSave = () => {
    haptic.medium();
    const prevGrid = answer?.grid_values ?? {};
    const nextRow: Record<string, string> = {};
    for (const col of cols) {
      const item = draft[col];
      if (item?.active && item.description.trim()) {
        nextRow[col] = 'bad';
        nextRow[`${COMMENT_PREFIX}${col}`] = item.description.trim();
      }
    }
    const nextGrid: GridValues = { ...prevGrid, [row]: nextRow };
    onSave(nextGrid);
    onClose();
  };

  const photosForCol = (col: string): AnswerPhoto[] => {
    if (!answer) return [];
    const all = photosByAnswer[answer.id] ?? [];
    const cap = captionFor(row, col);
    return all.filter(p => p.caption === cap);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={requestClose}
    >
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        <View style={styles.detailHeader}>
          <Pressable
            onPress={requestClose}
            style={styles.headerBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.ink} />
          </Pressable>
          <Text size="lg" weight="bold">ქამარი #{index}</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text size="sm" color={theme.colors.inkSoft} style={{ marginBottom: 4 }}>
            შეეხეთ კომპონენტს თუ აღმოაჩინეთ პრობლემა
          </Text>
          {cols.map(col => {
            const item = draft[col] ?? { active: false, description: '' };
            const isOpen = openCol === col;
            const showAsBad = item.active;
            return (
              <View key={col} style={styles.itemWrap}>
                <Pressable
                  onPress={() => toggleItem(col)}
                  style={({ pressed }) => [
                    styles.itemRow,
                    showAsBad && {
                      backgroundColor: theme.colors.dangerSoft,
                      borderColor: theme.colors.danger,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.itemBadge}>
                    {showAsBad ? (
                      <View style={styles.badgeRed}>
                        <Text size="lg" weight="bold" color="#fff">!</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeNeutral} />
                    )}
                  </View>
                  <Text size="base" weight="semibold" style={{ flex: 1 }}>
                    {col}
                  </Text>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.inkSoft}
                  />
                </Pressable>
                {isOpen && (
                  <Animated.View
                    entering={reduceMotion ? undefined : FadeInDown.duration(150)}
                    exiting={reduceMotion ? undefined : FadeOut.duration(100)}
                    style={styles.accordion}
                  >
                    <FloatingLabelInput
                      label="რა პრობლემაა?"
                      value={item.description}
                      onChangeText={t => setDescription(col, t)}
                      multiline
                      style={{ marginBottom: 12 }}
                    />
                    <View style={styles.photoRow}>
                      {photosForCol(col).map(p => (
                        <KamariPhotoThumb
                          key={p.id}
                          photo={p}
                          onDelete={() => onDeletePhoto(p)}
                        />
                      ))}
                      <Pressable
                        onPress={() => onPickPhoto(col)}
                        style={styles.addPhotoBtn}
                      >
                        <Ionicons name="camera-outline" size={22} color={theme.colors.inkSoft} />
                        <Text size="xs" color={theme.colors.inkSoft} style={{ marginTop: 2 }}>
                          ფოტო
                        </Text>
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => closeItem(col)}
                      hitSlop={{ top: 9, bottom: 9, left: 0, right: 0 }}
                      style={styles.closeBtn}
                    >
                      <Text size="sm" weight="semibold" color={theme.colors.inkSoft}>
                        დახურვა
                      </Text>
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.detailFooter, { paddingBottom: 12 + insets.bottom }]}>
          <Button title="შენახვა" onPress={handleSave} size="lg" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const KamariPhotoThumb = memo(function KamariPhotoThumb({
  photo,
  onDelete,
}: {
  photo: AnswerPhoto;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, photo.storage_path)
      .then(u => {
        if (!cancelled) setUri(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photo.storage_path]);
  return (
    <View>
      <View style={styles.thumb}>
        {uri ? <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" /> : null}
      </View>
      <Pressable onPress={onDelete} style={styles.thumbDelete} hitSlop={12}>
        <Ionicons name="close" size={12} color="#fff" />
      </Pressable>
    </View>
  );
});

// ─────────────────────────── Styles ─────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
  countWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 40,
  },
  countTitle: {
    textAlign: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  stepperBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNumberWrap: {
    minWidth: 120,
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 96,
    fontWeight: '700',
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily.display,
  },

  overviewContent: {
    padding: 16,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  itemBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRed: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNeutral: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
  },
  accordion: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: 0,
    padding: 12,
    gap: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -1,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbDelete: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailFooter: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
}
