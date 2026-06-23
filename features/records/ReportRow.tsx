import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, FileText } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { formatShortDateTime } from '../../lib/formatDate';
import type { Report } from '../../types/models';
import { getRecordStyles } from './styles';

/** Status-free report row, reused by Home / History / Drafts. */
export function ReportRow({
  report,
  onPress,
  showBorder,
}: {
  report: Report;
  onPress: () => void;
  showBorder?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getRecordStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.listRow, showBorder && styles.listRowBorder]}
      {...a11y(report.title, 'რეპორტის ნახვა', 'button')}
    >
      <View style={[styles.recordIcon, { backgroundColor: theme.colors.accentSoft }]}>
        <FileText size={16} color={theme.colors.accent} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listRowTitle} numberOfLines={1}>{report.title}</Text>
        <Text style={styles.listRowSubtitle}>
          {report.slides.length} სლაიდი · {formatShortDateTime(report.created_at)}
        </Text>
      </View>
      <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
    </Pressable>
  );
}
