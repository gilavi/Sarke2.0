import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { useTheme } from '../../lib/theme';
import type { Question } from '../../types/models';
import { staticStyles } from './styles';
import { measureError, parseMeasure } from './wizardSchema';

export function MeasureInput({
  question,
  initial,
  onCommit,
}: {
  question: Question;
  initial: number | null;
  onCommit: (value: number | null) => void;
}) {
  const { theme } = useTheme();

  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState(initial == null ? '' : String(initial));
  const lastCommitted = useRef<number | null>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (initial !== lastCommitted.current) {
      setText(initial == null ? '' : String(initial));
      lastCommitted.current = initial;
    }
  }, [initial]);

  useEffect(() => {
    const parsed = parseMeasure(text);
    if (parsed === lastCommitted.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastCommitted.current = parsed;
      onCommit(parsed);
    }, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, onCommit]);

  useEffect(() => {
    return () => {
      const parsed = parseMeasure(text);
      if (parsed !== lastCommitted.current) {
        lastCommitted.current = parsed;
        onCommit(parsed);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsed = parseMeasure(text);
  const error = measureError(question, parsed);
  const hasRange = question.min_val != null || question.max_val != null;

  return (
    <View style={{ gap: 6 }}>
      <View style={staticStyles.rowCenterGap10}>
        <FloatingLabelInput
          ref={inputRef}
          label={`${question.title ?? ''}${question.unit ? ` (${question.unit})` : ''}`}
          value={text}
          onChangeText={setText}
          onEndEditing={() => onCommit(parseMeasure(text))}
          keyboardType="decimal-pad"
          style={{ marginBottom: 0, flex: 1 }}
        />
        {question.unit ? (
          <Text style={{ fontWeight: '600', color: theme.colors.inkSoft }}>{question.unit}</Text>
        ) : null}
      </View>
      {hasRange ? (
        <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>
          დიაპაზონი: {question.min_val ?? '-'} – {question.max_val ?? '-'}
          {question.unit ? ` ${question.unit}` : ''}
        </Text>
      ) : null}
      {error ? (
        <Text style={{ fontSize: 12, color: theme.colors.danger }}>{error}</Text>
      ) : null}
    </View>
  );
}
