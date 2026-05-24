import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { QuestionAvatar, illustrationKeyFor } from '../../components/QuestionAvatar';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { Answer, AnswerPhoto, Question } from '../../types/models';
import { getstyles, staticStyles } from './styles';
import { MeasureInput } from './MeasureInput';
import { DebouncedFreetext } from './DebouncedFreetext';
import { DebouncedNotes } from './DebouncedNotes';
import { PhotoThumb } from './PhotoThumb';
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
  const [noteOpen, setNoteOpen] = useState(false);
  const answerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];
  const hasNote = !!(answer?.notes && answer.notes.length > 0);
  const showNoteField = noteOpen || hasNote;
  const hasPhotos = answerPhotos.length > 0;

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

      {hasPhotos ? (
        <View style={staticStyles.gap8}>
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
        </View>
      ) : null}

      {showNoteField ? (
        <DebouncedNotes
          initial={answer?.notes ?? null}
          onCommit={value => onAnswer(question, a => ({ ...a, notes: value || null }))}
        />
      ) : null}

      {!hasPhotos || !showNoteField ? (
        <View style={styles.chipRow}>
          {!hasPhotos ? (
            <Pressable onPress={onPickPhoto} style={styles.assistChip} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
              <Ionicons name="camera-outline" size={18} color={theme.colors.inkSoft} />
              <Text style={styles.assistChipText}>ფოტო</Text>
            </Pressable>
          ) : null}
          {!showNoteField ? (
            <Pressable onPress={() => setNoteOpen(true)} style={styles.assistChip} {...a11y('შენიშვნა', 'შეეხეთ შენიშვნის დასამატებლად', 'button')}>
              <Ionicons name="create-outline" size={18} color={theme.colors.inkSoft} />
              <Text style={styles.assistChipText}>შენიშვნა</Text>
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
    </View>
  );
});
