import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme } from '../../lib/theme';
import type { BLResultStatus } from '../../types/breathalyzerLog';
import { resultStatusIcon, resultStatusLabelKey } from './resultMeta';

interface Props {
  status: BLResultStatus;
  /** Show the numeric reading (e.g. 0.05) next to the icon. */
  value?: number;
  /** Show the long descriptive status label (used on the result step). */
  showLabel?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Monochrome safe/warning/fail indicator: a Lucide icon (ink) + optional reading
 * + optional descriptive label. Severity reads from the icon shape, never color —
 * matches the inspection answer-control rule and stays correct in dark mode.
 */
export function ResultStatus({ status, value, showLabel = false, size = 18, style }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const Icon = resultStatusIcon[status];
  return (
    <View style={[styles.row, style]}>
      <Icon size={size} color={theme.colors.ink} strokeWidth={1.5} />
      {value !== undefined ? (
        <Text style={[styles.value, { color: theme.colors.ink, fontSize: size - 2 }]}>
          {value.toFixed(2)}
        </Text>
      ) : null}
      {showLabel ? (
        <Text style={[styles.label, { color: theme.colors.inkSoft }]}>
          {t(resultStatusLabelKey[status])}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: 13, fontWeight: '600' },
});
