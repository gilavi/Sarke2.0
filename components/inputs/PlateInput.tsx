import React, { useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { PlateCell } from './PlateCell';

const SLOTS = (['letter', 'letter', 'digit', 'digit', 'digit', 'letter', 'letter'] as const)
  .map((kind) => ({ kind }));

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
  /** Suppresses the OS keyboard. Use with PlateInputHandle.pressKey + SerialKeypad. */
  customKeyboard?: boolean;
  /** Called when active slot kind changes (drives SerialKeypad layout). */
  onActiveSlotKindChange?: (kind: 'letter' | 'digit' | null) => void;
}

export interface PlateInputHandle {
  /** Feed a key from SerialKeypad: 'A'–'Z', '0'–'9', or 'Backspace'. */
  pressKey: (key: string) => void;
}

export const PlateInput = React.forwardRef<PlateInputHandle, PlateInputProps>(
  function PlateInput({ label, value, onChangeText, required, customKeyboard, onActiveSlotKindChange }, ref) {
    const { theme } = useTheme();
    const nativeRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null, null]);
    const chars = useMemo(() => parseValue(value), [value]);
    const [activeSlot, setActiveSlot] = useState<number | null>(customKeyboard ? 0 : null);

    const notifySlotKind = (i: number | null) => {
      onActiveSlotKindChange?.(i !== null ? SLOTS[i].kind : null);
    };

    const setSlot = (i: number, ch: string) => {
      const next = [...chars];
      next[i] = ch;
      onChangeText(format(next));
    };

    const focusSlot = (i: number) => {
      setActiveSlot(i);
      notifySlotKind(i);
      if (!customKeyboard) nativeRefs.current[i]?.focus();
    };

    // External key input (from SerialKeypad)
    useImperativeHandle(ref, () => ({
      pressKey(key: string) {
        const i = activeSlot ?? 0;
        if (key === 'Backspace') {
          if (chars[i]) {
            setSlot(i, '');
          } else if (i > 0) {
            const next = [...chars];
            next[i - 1] = '';
            onChangeText(format(next));
            focusSlot(i - 1);
          }
          return;
        }
        const ch = key.toUpperCase();
        const expect = SLOTS[i].kind;
        const ok = expect === 'letter' ? /[A-Z]/.test(ch) : /[0-9]/.test(ch);
        if (!ok) return;
        setSlot(i, ch);
        if (i < 6) focusSlot(i + 1);
      },
    }));

    // OS keyboard handlers (used when customKeyboard is false)
    const handleChange = (i: number, text: string) => {
      const cleaned = (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleaned.length === 0) { setSlot(i, ''); return; }
      if (cleaned.length > 1) {
        const next = [...chars];
        let cursor = i;
        for (const c of cleaned) {
          if (cursor > 6) break;
          const want = SLOTS[cursor].kind;
          const ok = want === 'letter' ? /[A-Z]/.test(c) : /[0-9]/.test(c);
          if (ok) { next[cursor] = c; cursor++; }
        }
        onChangeText(format(next));
        const focusIdx = Math.min(cursor, 6);
        nativeRefs.current[focusIdx]?.focus();
        return;
      }
      const ch = cleaned[cleaned.length - 1];
      const ok = SLOTS[i].kind === 'letter' ? /[A-Z]/.test(ch) : /[0-9]/.test(ch);
      if (!ok) return;
      setSlot(i, ch);
      if (i < 6) nativeRefs.current[i + 1]?.focus();
    };

    const handleKeyPress = (i: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Backspace' && !chars[i] && i > 0) {
        const next = [...chars];
        next[i - 1] = '';
        onChangeText(format(next));
        nativeRefs.current[i - 1]?.focus();
      }
    };

    const renderCell = (i: number) => (
      <PlateCell
        key={i}
        ch={chars[i]}
        isActive={activeSlot === i}
        slotKind={SLOTS[i].kind}
        customKeyboard={customKeyboard}
        onPress={() => focusSlot(i)}
        onChangeText={t => handleChange(i, t)}
        onKeyPress={e => handleKeyPress(i, e)}
        onFocus={() => { setActiveSlot(i); notifySlotKind(i); }}
        onBlur={() => setActiveSlot(s => (s === i ? null : s))}
        inputRef={r => { nativeRefs.current[i] = r; }}
        theme={theme}
      />
    );

    const dash = (
      <Text style={[styles.dash, { color: theme.colors.inkFaint }]}>–</Text>
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
          {renderCell(0)}
          {renderCell(1)}
          {dash}
          {renderCell(2)}
          {renderCell(3)}
          {renderCell(4)}
          {dash}
          {renderCell(5)}
          {renderCell(6)}
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  label: { fontSize: 12, fontWeight: '500', letterSpacing: 0.3 },
  asterisk: { color: '#EF4444' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dash: {
    fontSize: 18,
    fontWeight: '300',
    paddingHorizontal: 1,
    opacity: 0.35,
  },
});
