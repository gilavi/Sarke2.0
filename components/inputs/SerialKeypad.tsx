import React from 'react';
import { StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { PressBounce } from '../animations/PressBounce';

// QWERTY rows
const QWERTY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export interface SerialKeypadProps {
  slotKind: 'letter' | 'digit';
  onKey: (key: string) => void;
}

export function SerialKeypad({ slotKind, onKey }: SerialKeypadProps) {
  const { theme } = useTheme();

  const key = (label: string, value: string) => (
    <PressBounce
      key={label}
      onPress={() => onKey(value)}
      hapticOnPress="light"
      scaleTo={0.9}
      style={styles.key}
    >
      <Text style={[styles.keyText, { color: theme.colors.ink }]}>{label}</Text>
    </PressBounce>
  );

  const bsKey = (flex = 1) => (
    <PressBounce
      key="bs"
      onPress={() => onKey('Backspace')}
      hapticOnPress="light"
      scaleTo={0.9}
      style={[styles.key, { flex }]}
    >
      <Text style={[styles.keyText, { color: theme.colors.inkSoft, fontSize: 20 }]}>⌫</Text>
    </PressBounce>
  );

  if (slotKind === 'digit') {
    return (
      <View style={styles.pad}>
        <View style={styles.row}>
          {key('1', '1')}{key('2', '2')}{key('3', '3')}
        </View>
        <View style={styles.row}>
          {key('4', '4')}{key('5', '5')}{key('6', '6')}
        </View>
        <View style={styles.row}>
          {key('7', '7')}{key('8', '8')}{key('9', '9')}
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }} />
          {key('0', '0')}
          {bsKey()}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pad}>
      {/* Row 1: Q–P */}
      <View style={styles.row}>
        {QWERTY_ROWS[0].map(ch => key(ch, ch))}
      </View>
      {/* Row 2: A–L (slightly indented via half-key spacers) */}
      <View style={styles.row}>
        <View style={{ flex: 0.5 }} />
        {QWERTY_ROWS[1].map(ch => key(ch, ch))}
        <View style={{ flex: 0.5 }} />
      </View>
      {/* Row 3: Z–M + backspace */}
      <View style={styles.row}>
        <View style={{ flex: 1 }} />
        {QWERTY_ROWS[2].map(ch => key(ch, ch))}
        {bsKey()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    width: '100%',
    paddingHorizontal: 4,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 0,
  },
  key: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
