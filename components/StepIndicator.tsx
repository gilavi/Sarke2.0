import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';

interface Props {
  steps: number;
  current: number; // 1-based
}

export function StepIndicator({ steps, current }: Props) {
  const { theme } = useTheme();
  const nums = Array.from({ length: steps }, (_, i) => i + 1);

  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: theme.colors.borderStrong }]} />
      {nums.map(n => {
        const done = n < current;
        const active = n === current;
        return (
          <View
            key={n}
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.surfaceSecondary,
                borderColor: theme.colors.borderStrong,
              },
              active && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
              done && { backgroundColor: theme.colors.primary[700], borderColor: theme.colors.primary[700] },
            ]}
          >
            {done ? (
              <Ionicons name="checkmark" size={11} color="#fff" />
            ) : (
              <Text style={[styles.dotText, { color: theme.colors.ink }, active && { color: '#fff' }]}>
                {n}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: '50%',
    left: 40,
    right: 40,
    height: 1,
    zIndex: 0,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
