import React, { useMemo, useRef } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { useTheme } from '../../lib/theme';

const SLOTS = [
  { kind: 'letter' as const },
  { kind: 'letter' as const },
  { kind: 'digit' as const },
  { kind: 'digit' as const },
  { kind: 'digit' as const },
  { kind: 'letter' as const },
  { kind: 'letter' as const },
];

const BRAND_GREEN = '#1D9E75';

function parseValue(raw: string): string[] {
  const cleaned = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  const out: string[] = ['', '', '', '', '', '', ''];
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const expect = SLOTS[i].kind;
    if (expect === 'letter' && /[A-Z]/.test(ch)) out[i] = ch;
    else if (expect === 'digit' && /[0-9]/.test(ch)) out[i] = ch;
    else out[i] = '';
  }
  return out;
}

function format(chars: string[]): string {
  const a = chars.slice(0, 2).join('');
  const b = chars.slice(2, 5).join('');
  const c = chars.slice(5, 7).join('');
  if (!a && !b && !c) return '';
  return [a, b, c].filter(Boolean).join('-');
}

export interface PlateInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
}

export function PlateInput({ label, value, onChangeText, required }: PlateInputProps) {
  const { theme } = useTheme();
  const refs = useRef<Array<TextInput | null>>([null, null, null, null, null, null, null]);
  const chars = useMemo(() => parseValue(value), [value]);

  const setSlot = (i: number, ch: string) => {
    const next = [...chars];
    next[i] = ch;
    onChangeText(format(next));
  };

  const handleChange = (i: number, text: string) => {
    const expect = SLOTS[i].kind;
    const cleaned = (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length === 0) {
      setSlot(i, '');
      return;
    }
    // Pasted multiple chars — distribute starting at i
    if (cleaned.length > 1) {
      const next = [...chars];
      let cursor = i;
      for (const c of cleaned) {
        if (cursor > 6) break;
        const want = SLOTS[cursor].kind;
        const ok = want === 'letter' ? /[A-Z]/.test(c) : /[0-9]/.test(c);
        if (ok) {
          next[cursor] = c;
          cursor++;
        }
      }
      onChangeText(format(next));
      const focusIdx = Math.min(cursor, 6);
      refs.current[focusIdx]?.focus();
      return;
    }
    // Single char
    const ch = cleaned[cleaned.length - 1];
    const ok = expect === 'letter' ? /[A-Z]/.test(ch) : /[0-9]/.test(ch);
    if (!ok) return;
    setSlot(i, ch);
    if (i < 6) refs.current[i + 1]?.focus();
  };

  const handleKeyPress = (
    i: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !chars[i] && i > 0) {
      const next = [...chars];
      next[i - 1] = '';
      onChangeText(format(next));
      refs.current[i - 1]?.focus();
    }
  };

  const renderBox = (i: number) => {
    const ch = chars[i];
    return (
      <TextInput
        key={i}
        ref={r => { refs.current[i] = r; }}
        value={ch}
        onChangeText={t => handleChange(i, t)}
        onKeyPress={e => handleKeyPress(i, e)}
        keyboardType={SLOTS[i].kind === 'digit' ? 'number-pad' : 'default'}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={1}
        selectTextOnFocus
        style={[
          styles.box,
          {
            borderColor: ch ? BRAND_GREEN : theme.colors.border,
            color: theme.colors.ink,
            backgroundColor: theme.colors.surface,
            fontFamily: theme.typography.fontFamily.body,
          },
        ]}
      />
    );
  };

  const dash = (
    <Text style={[styles.dash, { color: theme.colors.inkFaint }]}>-</Text>
  );

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.inkSoft }]}>
          {label}
          {required ? <Text style={styles.asterisk}> *</Text> : null}
        </Text>
      ) : null}
      <View style={styles.row}>
        {renderBox(0)}
        {renderBox(1)}
        {dash}
        {renderBox(2)}
        {renderBox(3)}
        {renderBox(4)}
        {dash}
        {renderBox(5)}
        {renderBox(6)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600' },
  asterisk: { color: '#EF4444' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  box: {
    width: 36,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    padding: 0,
  },
  dash: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
});
