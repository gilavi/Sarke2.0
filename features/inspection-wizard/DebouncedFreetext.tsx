import { useEffect, useMemo, useRef, useState } from 'react';
import { InputAccessoryView, Platform, Pressable, TextInput, View } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { useTheme } from '../../lib/theme';
import { getstyles } from './styles';

export function DebouncedFreetext({
  initial,
  onCommit,
}: {
  initial: string;
  onCommit: (value: string) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState(initial);
  const lastCommitted = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessoryId = Platform.OS === 'ios' ? 'wizard-freetext-accessory' : undefined;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Sync external updates (e.g., first load)
    if (initial !== lastCommitted.current) {
      setText(initial);
      lastCommitted.current = initial;
    }
  }, [initial]);

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

  useEffect(() => {
    return () => {
      // Flush pending value on unmount (page change)
      if (text !== lastCommitted.current) {
        lastCommitted.current = text;
        onCommit(text);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <FloatingLabelInput
        ref={inputRef}
        label="დასკვნა"
        value={text}
        onChangeText={setText}
        onEndEditing={() => onCommit(text)}
        multiline
        inputAccessoryViewID={accessoryId}
      />
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
    </>
  );
}
