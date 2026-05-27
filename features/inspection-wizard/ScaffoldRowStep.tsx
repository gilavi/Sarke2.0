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

// Scaffold (non-harness) row step. Mounted by the wizard when
// `step.kind === 'gridRow'` AND `question.grid_rows[0] !== 'N1'`.
// Sibling `HarnessRowStep` handles the N1-N15 harness variant.

export const ScaffoldRowStep = memo(function ScaffoldRowStep({
  question,
  row,
  answer,
  photosByAnswer,
  onAnswer,
  onPickPhoto,
  onDeletePhoto,
}: {
  question: Question;
  row: string;
  answer: Answer | undefined;
  photosByAnswer: Record<string, AnswerPhoto[]>;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onPickPhoto: () => void;
  onDeletePhoto: (photo: AnswerPhoto) => Promise<void>;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const values: Record<string, string> = (answer?.grid_values ?? {})[row] ?? {};
  const rowIndex = (question.grid_rows ?? []).indexOf(row);
  const rowHint = rowIndex >= 0 ? (question.grid_row_hints?.[rowIndex] ?? null) : null;
  const allAnswerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];
  const rowTag = `row:${row}`;
  const answerPhotos = allAnswerPhotos.filter(p => p.caption === rowTag);
  const hasPhotos = answerPhotos.length > 0;

  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);
  const commentValue = values['კომენტარი'] ?? '';
  const [commentOpen, setCommentOpen] = useState(false);
  const showCommentField = !!commentValue || commentOpen;
  const scrollRef = useRef<ScrollView>(null);

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
        {rowHint ? (
          <Text style={{ fontSize: 13, color: theme.colors.inkSoft, textAlign: 'center', paddingHorizontal: 16, lineHeight: 18 }}>
            {rowHint}
          </Text>
        ) : null}
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
