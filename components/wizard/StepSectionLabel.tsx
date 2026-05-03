import { StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';

interface StepSectionLabelProps {
  title: string;
}

/**
 * Uppercase divider label used between sections in multi-step inspection flows.
 * Renders a small all-caps text with a bottom hairline separator.
 */
export function StepSectionLabel({ title }: StepSectionLabelProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.text,
          { color: theme.colors.inkSoft, borderBottomColor: theme.colors.hairline },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 10, marginTop: 4 },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
});
