import { StyleSheet, View } from 'react-native';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';

interface Props {
  steps: number;
  current: number; // 1-based
}

/** Progress bar stepper — matches the inspection wizard header style. */
export function StepIndicator({ steps, current }: Props) {
  const { theme } = useTheme();
  const progress = Math.max(0, Math.min(1, current / Math.max(1, steps)));

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.colors.inkSoft }]}>
        ნაბიჯი {current} / {steps}
      </Text>
      <View style={[styles.track, { backgroundColor: theme.colors.subtleSurface }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: theme.colors.accent, width: `${progress * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
