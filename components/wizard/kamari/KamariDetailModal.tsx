import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../primitives/A11yText';
import { Button } from '../../ui';
import { useTheme } from '../../../lib/theme';
import { useAccessibilitySettings } from '../../../lib/accessibility';
import { FloatingLabelInput } from '../../inputs/FloatingLabelInput';
import { haptic } from '../../../lib/haptics';
import type { Answer, AnswerPhoto, GridValues, Question } from '../../../types/models';
import { COMMENT_PREFIX, captionFor, componentColsFor, rowKey } from './_shared';
import { getstyles } from './styles';
import { KamariPhotoThumb } from './KamariPhotoThumb';

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

        <KeyboardAwareScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          bottomOffset={24}
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
        </KeyboardAwareScrollView>

        <View style={[styles.detailFooter, { paddingBottom: 12 + insets.bottom }]}>
          <Button title="შენახვა" onPress={handleSave} size="lg" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}