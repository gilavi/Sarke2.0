import { memo, useMemo, useState } from 'react';
import { View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { QuestionAvatar, illustrationKeyFor } from '../../components/QuestionAvatar';
import { useTheme } from '../../lib/theme';
import type { Answer, AnswerPhoto, Question } from '../../types/models';
import { getstyles, staticStyles } from './styles';
import { MeasureInput } from './MeasureInput';
import { DebouncedFreetext } from './DebouncedFreetext';
import { AttachmentBars } from './AttachmentBars';
import { PhotoPreviewModal } from './PhotoPreviewModal';

export const QuestionStep = memo(function QuestionStep({
  question,
  answer,
  photosByAnswer,
  onAnswer,
  onPickPhoto,
  onDeletePhoto,
}: {
  question: Question;
  answer: Answer | undefined;
  photosByAnswer: Record<string, AnswerPhoto[]>;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onPickPhoto: () => void;
  onDeletePhoto: (photo: AnswerPhoto) => Promise<void>;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);
  const answerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];

  const illoKey = illustrationKeyFor(question.title);

  return (
    <View style={[staticStyles.gap16, staticStyles.padTop16]}>
      {illoKey ? <QuestionAvatar illustrationKey={illoKey} variant="banner" /> : null}
      <View style={staticStyles.centerGap14}>
        <Text style={[styles.questionTitle, { textAlign: 'center' }]}>{question.title}</Text>
      </View>

      {question.type === 'measure' ? (
        <MeasureInput
          question={question}
          initial={answer?.value_num ?? null}
          onCommit={num => onAnswer(question, a => ({ ...a, value_num: num }))}
        />
      ) : null}
      {question.type === 'freetext' ? (
        <DebouncedFreetext
          initial={answer?.value_text ?? ''}
          onCommit={value => onAnswer(question, a => ({ ...a, value_text: value }))}
        />
      ) : null}
      {question.type === 'photo_upload' ? (
        <Text style={{ color: theme.colors.inkSoft, fontSize: 14, textAlign: 'center' }}>
          დაამატეთ ფოტოები ქვემოთ
        </Text>
      ) : null}

      <AttachmentBars
        photos={answerPhotos}
        onPickPhoto={onPickPhoto}
        onDeletePhoto={onDeletePhoto}
        onViewPhoto={setPreviewPhoto}
        note={answer?.notes ?? null}
        onNoteCommit={value => onAnswer(question, a => ({ ...a, notes: value || null }))}
      />

      <PhotoPreviewModal
        photo={previewPhoto}
        visible={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        onDelete={async (photo) => {
          await onDeletePhoto(photo);
        }}
      />
    </View>
  );
});
