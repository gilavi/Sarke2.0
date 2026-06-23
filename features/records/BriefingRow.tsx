import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, Megaphone } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { formatShortDateTime } from '../../lib/formatDate';
import type { Briefing } from '../../types/models';
import { getRecordStyles } from './styles';

/** Status-free briefing row, reused by Home / History / Drafts. */
export function BriefingRow({
  briefing,
  onPress,
  showBorder,
}: {
  briefing: Briefing;
  onPress: () => void;
  showBorder?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getRecordStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.listRow, showBorder && styles.listRowBorder]}
      {...a11y('ინსტრუქტაჟი', 'დეტალების ნახვა', 'button')}
    >
      <View style={[styles.recordIcon, { backgroundColor: theme.colors.harnessSoft }]}>
        <Megaphone size={16} color={theme.colors.harnessTint} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listRowTitle} numberOfLines={1}>{formatShortDateTime(briefing.dateTime)}</Text>
        <Text style={styles.listRowSubtitle}>{briefing.participants.length} მონაწილე</Text>
      </View>
      <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
    </Pressable>
  );
}
