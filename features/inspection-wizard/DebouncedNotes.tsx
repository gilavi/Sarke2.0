import { useEffect, useMemo, useRef, useState } from 'react';
import { InputAccessoryView, Platform, Pressable, View } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { useTheme } from '../../lib/theme';
import { getstyles } from './styles';

export function DebouncedNotes({
  initial,
  onCommit,
}: {
  initial: string | null;
  onCommit: (value: string) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const [text, setText] = useState(initial ?? '');
  const lastCommitted = useRef(initial ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessoryId = Platform.OS === 'ios' ? 'wizard-notes-accessory' : undefined;

  useEffect(() => {
    const nextInitial = initial ?? '';
    if (nextInitial !== lastCommitted.current) {
      setText(nextInitial);
      lastCommitted.current = nextInitial;
    }
  }, [initial]);

  // Debounced commit — matches the freetext/measure pattern so notes survive
  // backgrounding, keyboard dismiss, etc. without waiting on onBlur.
  useEffect(() => {
    if (text === lastCommitted.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastCommitted.current = text;
      onCommit(text);
    }, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, onCommit]);

  // Flush pending value on unmount so a mid-typed note isn't lost when the
  // user taps Next/Back before the debounce fires.
  useEffect(() => {
    return () => {
      if (text !== lastCommitted.current) {
        lastCommitted.current = text;
        onCommit(text);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View>
      <FloatingLabelInput
        label="შენიშვნა"
        value={text}
        onChangeText={setText}
        onEndEditing={() => onCommit(text)}
        multiline
        maxLength={500}
        style={{ marginBottom: 4 }}
        inputAccessoryViewID={accessoryId}
      />
      <Text style={[styles.label, { textAlign: 'right', marginBottom: 0 }]}>
        {text.length}/500
      </Text>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={[styles.accessoryBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.hairline }]}>
            <Pressable
              onPress={() => KeyboardController.dismiss()}
              style={styles.accessoryBtn}
            >
              <Text style={[styles.accessoryBtnText, { color: theme.colors.accent }]}>მზადაა</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
}
