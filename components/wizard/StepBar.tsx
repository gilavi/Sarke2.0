import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';

interface StepBarProps {
  /** 0-based index of the current step. */
  step: number;
  /** Display label for each step. Length determines total step count. */
  stepLabels: string[];
}

/**
 * Horizontal step-progress bar used by multi-step inspection flows.
 * Completed steps show a green checkmark; the current step is highlighted in
 * accent; future steps are gray. Connectors between dots fill with accent as
 * the user progresses.
 */
export function StepBar({ step, stepLabels }: StepBarProps) {
  const { theme } = useTheme();
  const successColor = theme.colors.semantic.success;

  return (
    <View style={[styles.bar, { borderBottomColor: theme.colors.hairline }]}>
      {stepLabels.map((label, i) => [
        i > 0 && (
          <View
            key={`c${i}`}
            style={[
              styles.connector,
              { backgroundColor: i <= step ? theme.colors.accent : theme.colors.hairline },
            ]}
          />
        ),
        <View key={`s${i}`} style={styles.stepItem}>
          <View
            style={[
              styles.dot,
              {
                borderColor: i < step ? successColor : i === step ? theme.colors.accent : theme.colors.hairline,
                backgroundColor: i < step ? successColor : i === step ? theme.colors.accent : 'transparent',
              },
            ]}
          >
            {i < step ? (
              <Ionicons name="checkmark" size={10} color="#fff" />
            ) : (
              <Text style={[styles.dotNum, i === step && styles.dotNumActive]}>{i + 1}</Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              i === step && { color: theme.colors.accent, fontWeight: '700' },
              i < step && { color: successColor },
            ]}
          >
            {label}
          </Text>
        </View>,
      ])}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  connector: {
    flex: 1,
    height: 1.5,
    marginBottom: 16,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotNum: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  dotNumActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});
