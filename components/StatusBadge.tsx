import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { STATUS_BADGE_BG, STATUS_BADGE_ICON } from '../lib/statusColors';
import type { CalendarStatus } from '../lib/statusColors';

export type { CalendarStatus as InspectionStatus };

export function StatusBadge({ status }: { status: CalendarStatus }) {
  const { theme } = useTheme();
  const bg = STATUS_BADGE_BG[status] ?? STATUS_BADGE_BG.draft;
  const icon = STATUS_BADGE_ICON[status] ?? STATUS_BADGE_ICON.draft;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: theme.colors.surface },
      ]}
    >
      <Ionicons name={icon as any} size={9} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
