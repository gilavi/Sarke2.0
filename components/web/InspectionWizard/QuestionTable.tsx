import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SegmentedControl } from './SegmentedControl';
import {
  WIZARD_COLORS as C,
  webStyle,
  type AnswerDetail,
  type AnswerValue,
  type Question,
} from './types';

interface QuestionTableProps {
  questions: Question[];
  answers: Record<string, AnswerValue>;
  details: Record<string, AnswerDetail>;
  onAnswer: (questionId: string, value: AnswerValue) => void;
  onComment: (questionId: string, comment: string) => void;
  onAddPhoto: (questionId: string) => void;
}

const KEY_TO_ANSWER: Record<string, AnswerValue> = {
  y: 'yes',
  '1': 'yes',
  n: 'no',
  '2': 'no',
  '3': 'na',
};

/**
 * Web-appropriate question grid: one focusable row per question with an inline
 * segmented control. Keyboard — when a row is focused: Y/1 = კი, N/2 = არა,
 * 3/Space = N/A. A one-time hint fades after 3s. Rows answered `no` expand to
 * reveal a comment field and photo button. Web only.
 */
export function QuestionTable({
  questions,
  answers,
  details,
  onAnswer,
  onComment,
  onAddPhoto,
}: QuestionTableProps) {
  const focusedRef = useRef<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const hintShownRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function handleKey(event: KeyboardEvent) {
      const questionId = focusedRef.current;
      if (!questionId) return;
      const question = questions.find((q) => q.id === questionId);
      if (!question) return;

      const key = event.key.toLowerCase();
      let answer: AnswerValue | undefined = KEY_TO_ANSWER[key];
      if (event.key === ' ') answer = 'na';
      if (!answer) return;
      if (!question.options.includes(answer)) return;

      event.preventDefault();
      onAnswer(questionId, answer);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [questions, onAnswer]);

  if (Platform.OS !== 'web') return null;

  function handleFocus(questionId: string) {
    focusedRef.current = questionId;
    if (!hintShownRef.current) {
      hintShownRef.current = true;
      setHintVisible(true);
      setTimeout(() => setHintVisible(false), 3000);
    }
  }

  return (
    <View style={styles.table}>
      {hintVisible && (
        <Text style={styles.hint}>Y = კი · N = არა · 3 = N/A</Text>
      )}
      {questions.map((question, index) => (
        <QuestionRow
          key={question.id}
          question={question}
          index={index}
          value={answers[question.id]}
          detail={details[question.id]}
          onFocus={() => handleFocus(question.id)}
          onBlur={() => {
            if (focusedRef.current === question.id) focusedRef.current = null;
          }}
          onAnswer={(value) => onAnswer(question.id, value)}
          onComment={(comment) => onComment(question.id, comment)}
          onAddPhoto={() => onAddPhoto(question.id)}
        />
      ))}
    </View>
  );
}

function QuestionRow({
  question,
  index,
  value,
  detail,
  onFocus,
  onBlur,
  onAnswer,
  onComment,
  onAddPhoto,
}: {
  question: Question;
  index: number;
  value?: AnswerValue;
  detail?: AnswerDetail;
  onFocus: () => void;
  onBlur: () => void;
  onAnswer: (value: AnswerValue) => void;
  onComment: (comment: string) => void;
  onAddPhoto: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const expanded = value === 'no' && (question.hasComment || question.hasPhoto);
  const photoCount = detail?.photos?.length ?? 0;

  return (
    <Pressable
      accessibilityRole="none"
      onFocus={() => {
        setFocused(true);
        onFocus();
      }}
      onBlur={() => {
        setFocused(false);
        onBlur();
      }}
      style={[
        styles.row,
        index % 2 === 1 && styles.rowAlt,
        focused && styles.rowFocused,
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.questionLabel}>{question.label}</Text>
        <SegmentedControl options={question.options} value={value} onChange={onAnswer} />
      </View>

      {expanded && (
        <View style={styles.expand}>
          {question.hasComment && (
            <TextInput
              multiline
              numberOfLines={2}
              placeholder="კომენტარი..."
              placeholderTextColor={C.textGray}
              defaultValue={detail?.comment}
              onChangeText={onComment}
              style={styles.textarea}
            />
          )}
          {question.hasPhoto && (
            <Pressable onPress={onAddPhoto} accessibilityRole="button" style={styles.photoButton}>
              <Text style={styles.photoButtonText}>
                + ფოტო{photoCount > 0 ? ` (${photoCount})` : ''}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  table: {
    width: '100%',
  },
  hint: webStyle({
    fontSize: 12,
    color: C.textGray,
    paddingBottom: 8,
    transitionProperty: 'opacity',
    transitionDuration: '300ms',
  }),
  row: webStyle({
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    outlineStyle: 'none',
  }),
  rowAlt: {
    backgroundColor: C.rowAltBg,
  },
  rowFocused: {
    borderWidth: 2,
    borderColor: C.green,
    paddingHorizontal: 6,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
  },
  questionLabel: {
    flex: 1,
    fontSize: 14,
    color: C.text,
  },
  expand: webStyle({
    paddingBottom: 12,
    gap: 8,
    transitionProperty: 'all',
    transitionDuration: '200ms',
  }),
  textarea: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: C.text,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  photoButton: webStyle({
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  }),
  photoButtonText: {
    fontSize: 13,
    color: C.textGray,
  },
});
