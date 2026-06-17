import { memo, useState } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { QuestionAvatar, illustrationKeyFor } from '../../components/QuestionAvatar';
import { useTheme } from '../../lib/theme';
import type { Answer, AnswerPhoto, GridValues, Question } from '../../types/models';
import { staticStyles } from './styles';
import { AttachmentBars } from './AttachmentBars';
import { PhotoPreviewModal } from './PhotoPreviewModal';

// Scaffold (non-harness) row step. Mounted by the wizard when
// `step.kind === 'gridRow'` AND `question.grid_rows[0] !== 'N1'`.
// Sibling `HarnessRowStep` handles the N1-N15 harness variant.
// The verdict options live in the footer (ScaffoldFooterButtons); this body is
// the illustration + the shared photo/note AttachmentBars (same as QuestionStep).

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

  const values: Record<string, string> = (answer?.grid_values ?? {})[row] ?? {};
  const rowIndex = (question.grid_rows ?? []).indexOf(row);
  const rowHint = rowIndex >= 0 ? (question.grid_row_hints?.[rowIndex] ?? null) : null;
  const allAnswerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];
  const rowTag = `row:${row}`;
  const answerPhotos = allAnswerPhotos.filter(p => p.caption === rowTag);

  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);
  const commentValue = values['კომენტარი'] ?? '';

  // Persist the row comment under the same grid key the PDF reads.
  const setComment = (text: string) => {
    onAnswer(question, a => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      const cur: Record<string, string> = { ...(grid[row] ?? {}) };
      if (text.trim()) cur['კომენტარი'] = text;
      else delete cur['კომენტარი'];
      grid[row] = cur;
      return { ...a, grid_values: grid };
    });
  };

  return (
    <KeyboardAwareScrollView
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

      <AttachmentBars
        photos={answerPhotos}
        onPickPhoto={onPickPhoto}
        onDeletePhoto={onDeletePhoto}
        onViewPhoto={setPreviewPhoto}
        note={commentValue}
        onNoteCommit={setComment}
      />

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
