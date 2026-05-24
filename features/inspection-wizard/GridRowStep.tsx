import { memo, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { QuestionAvatar, illustrationKeyFor } from '../../components/QuestionAvatar';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { Answer, AnswerPhoto, GridValues, Question } from '../../types/models';
import { getstyles, staticStyles } from './styles';
import { PhotoThumb } from './PhotoThumb';
import { PhotoPreviewModal } from './PhotoPreviewModal';

export const GridRowStep = memo(function GridRowStep({
  question,
  row,
  answer,
  photosByAnswer,
  isFirstRow,
  harnessRowCount,
  setHarnessRowCount,
  onAnswer,
  onPickPhoto,
  onDeletePhoto,
  onAdvance,
}: {
  question: Question;
  row: string;
  answer: Answer | undefined;
  photosByAnswer: Record<string, AnswerPhoto[]>;
  isFirstRow: boolean;
  harnessRowCount: number;
  setHarnessRowCount: (n: number) => void;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onPickPhoto: () => void;
  onDeletePhoto: (photo: AnswerPhoto) => Promise<void>;
  onAdvance: () => void;
}) {
  // onAdvance is consumed by the scaffold footer (rendered in the wizard's
  // global footer bar), not inside the row body — kept in the signature so
  // the call site stays uniform with the parent.
  void onAdvance;
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const cols = question.grid_cols ?? [];
  const isHarness = (question.grid_rows?.[0] ?? '') === 'N1';
  const values: Record<string, string> = (answer?.grid_values ?? {})[row] ?? {};
  // The whole component_grid shares one answer record; photos for that
  // answer are tagged with `caption = "row:<row>"` at upload so we can scope
  // them back to the row that uploaded them.
  const allAnswerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];
  const rowTag = `row:${row}`;
  const answerPhotos = allAnswerPhotos.filter(p => p.caption === rowTag);
  const hasPhotos = answerPhotos.length > 0;
  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);

  const setValue = (col: string, value: string | null, exclusive: boolean) => {
    onAnswer(question, a => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      const prev = grid[row] ?? {};
      const cur: Record<string, string> = exclusive ? {} : { ...prev };
      // Preserve comment when switching status options exclusively
      if (exclusive && prev['კომენტარი']) cur['კომენტარი'] = prev['კომენტარი'];
      if (value === null) delete cur[col];
      else cur[col] = value;
      grid[row] = cur;
      return { ...a, grid_values: grid };
    });
  };

  // Scaffold (non-harness): full-height flex layout with big status buttons
  if (!isHarness) {
    const commentValue = values['კომენტარი'] ?? '';
    const [commentOpen, setCommentOpen] = useState(false);
    const showCommentField = !!commentValue || commentOpen;
    const scrollRef = useRef<ScrollView>(null);

    return (
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[staticStyles.padH16, staticStyles.padTop16, staticStyles.padB24, staticStyles.gap16]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={120}
      >
        <View style={staticStyles.centerPadV8Gap12}>
          <QuestionAvatar illustrationKey={illustrationKeyFor(row)} />
          <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' }}>
            {row}
          </Text>
        </View>

        <>
            {hasPhotos ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[staticStyles.gap10, staticStyles.padV8]}
              >
                {answerPhotos.map(p => (
                  <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile} {...a11y('ფოტოს ნახვა', 'შეეხეთ ფოტოს დიდად სანახავად', 'button')}>
                    <PhotoThumb photo={p} size={120} />
                  </Pressable>
                ))}
                <Pressable onPress={onPickPhoto} style={styles.addPhotoTile} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
                  <Ionicons name="add" size={32} color={theme.colors.inkSoft} />
                </Pressable>
              </ScrollView>
            ) : null}

            {showCommentField ? (
              <FloatingLabelInput
                label="კომენტარი"
                value={commentValue}
                onChangeText={text => setValue('კომენტარი', text || null, false)}
                autoFocus
                onFocus={() => {
                  requestAnimationFrame(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  });
                }}
              />
            ) : null}

            {!hasPhotos || !showCommentField ? (
              <View style={styles.chipRow}>
                {!hasPhotos ? (
                  <Pressable onPress={onPickPhoto} style={styles.assistChip} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
                    <Ionicons name="camera-outline" size={18} color={theme.colors.inkSoft} />
                    <Text style={styles.assistChipText}>ფოტო</Text>
                  </Pressable>
                ) : null}
                {!showCommentField ? (
                  <Pressable
                    onPress={() => setCommentOpen(true)}
                    style={styles.assistChip}
                    {...a11y('კომენტარი', 'შეეხეთ კომენტარის დასამატებლად', 'button')}
                  >
                    <Ionicons name="create-outline" size={18} color={theme.colors.inkSoft} />
                    <Text style={styles.assistChipText}>კომენტარი</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </>

        <PhotoPreviewModal
          photo={previewPhoto}
          visible={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          onDelete={async (photo) => {
            await onDeletePhoto(photo);
          }}
        />
      </KeyboardAwareScrollView>
    );
  }

  // Harness: scrollable list of components with ✓/✗ chips
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[staticStyles.stepScrollContent, staticStyles.padTop16]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={120}
    >
      <View style={{ alignItems: 'center', paddingVertical: 8, gap: 4 }}>
        <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>{question.title}</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' }}>
          {row}
        </Text>
      </View>

      {isFirstRow ? (
        <View style={staticStyles.rowBetweenPadH4}>
          <Text style={{ fontWeight: '600' }}>რამდენი ქამარი სულ?</Text>
          <View style={staticStyles.rowCenterGap12}>
            <Pressable onPress={() => setHarnessRowCount(Math.max(1, harnessRowCount - 1))} {...a11y('ქამრების რაოდენობის შემცირება', 'შეეხეთ რაოდენობის შესამცირებლად', 'button')}>
              <Ionicons name="remove-circle" size={28} color={theme.colors.accent} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{harnessRowCount}</Text>
            <Pressable onPress={() => setHarnessRowCount(Math.min(15, harnessRowCount + 1))} {...a11y('ქამრების რაოდენობის გაზრდა', 'შეეხეთ რაოდენობის გასაზრდელად', 'button')}>
              <Ionicons name="add-circle" size={28} color={theme.colors.accent} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={staticStyles.gap8}>
        {cols.map(col => {
          const current = values[col];
          return (
            <View key={col} style={styles.harnessRow}>
              <Text style={staticStyles.harnessColLabel}>{col}</Text>
              <View style={staticStyles.harnessChipRow}>
                <Pressable
                  onPress={() => setValue(col, 'ვარგისია', false)}
                  style={[
                    styles.chip,
                    current === 'ვარგისია' && {
                      backgroundColor: theme.colors.accentSoft,
                      borderColor: theme.colors.accent,
                    },
                  ]}
                  {...a11y(col + ' - ვარგისია', 'შეეხეთ ვარგისად მოსანიშნად', 'button')}
                >
                  <Text style={{ color: current === 'ვარგისია' ? theme.colors.accent : theme.colors.inkSoft }}>
                    ✓
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setValue(col, 'დაზიანებულია', false)}
                  style={[
                    styles.chip,
                    current === 'დაზიანებულია' && {
                      backgroundColor: theme.colors.dangerSoft,
                      borderColor: theme.colors.danger,
                    },
                  ]}
                  {...a11y(col + ' - დაზიანებულია', 'შეეხეთ დაზიანებულად მოსანიშნად', 'button')}
                >
                  <Text style={{ color: current === 'დაზიანებულია' ? theme.colors.danger : theme.colors.inkSoft }}>
                    ✗
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {hasPhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[staticStyles.gap10, staticStyles.padV8]}
        >
          {answerPhotos.map(p => (
            <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile} {...a11y('ფოტოს ნახვა', 'შეეხეთ ფოტოს დიდად სანახავად', 'button')}>
              <PhotoThumb photo={p} size={120} />
            </Pressable>
          ))}
          <Pressable onPress={onPickPhoto} style={styles.addPhotoTile} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
            <Ionicons name="add" size={32} color={theme.colors.inkSoft} />
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.chipRow}>
          <Pressable onPress={onPickPhoto} style={styles.assistChip} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
            <Ionicons name="camera-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={styles.assistChipText}>ფოტო</Text>
          </Pressable>
        </View>
      )}

      <PhotoPreviewModal
        photo={previewPhoto}
        visible={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        onDelete={async (photo) => {
          await onDeletePhoto(photo);
        }}
      />
    </KeyboardAwareScrollView>
  );
});
