import { StyleSheet, View } from 'react-native';
import { STATUS_BADGE_BG } from '../lib/statusColors';
import type { CalendarStatus } from '../lib/statusColors';
import { useTheme } from '../lib/theme';

export type { CalendarStatus as InspectionStatus };

export function StatusBadge({ status }: { status: CalendarStatus }) {
  const { theme } = useTheme();
  const bg = STATUS_BADGE_BG[status] ?? STATUS_BADGE_BG.draft;

  return <View style={[styles.dot, { backgroundColor: bg, borderColor: theme.colors.background }]} />;
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
