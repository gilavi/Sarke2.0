// Shared date/time picker bottom sheet.
// iOS: slides up a modal with display="inline" tinted to the app accent.
// Android: native dialog (no wrapper needed).
// onChange fires on every scroll on iOS, once on confirm on Android.
// onClose fires on Done tap (iOS) or after confirm/dismiss (Android).

import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';

interface Props {
  visible: boolean;
  value: Date;
  mode: 'date' | 'time';
  onClose: () => void;
  onChange: (date: Date) => void;
}

export function DatePickerSheet({ visible, value, mode, onClose, onChange }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        onChange={(_, d) => {
          if (d) onChange(d);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.ink }]}>
              {mode === 'date' ? 'თარიღი' : 'დრო'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={{ color: theme.colors.accent, fontSize: 16, fontWeight: '600' }}>
                დასრულება
              </Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode={mode}
            display="inline"
            accentColor={theme.colors.accent}
            onChange={(_, d) => { if (d) onChange(d); }}
            style={{ backgroundColor: theme.colors.surface }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
});
