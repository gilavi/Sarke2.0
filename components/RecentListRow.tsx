import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';

export interface RecentListRowProps {
  leading?: ReactNode;
  title: string;
  subtitle?: string | null;
  trailing?: string | null;
  isLast?: boolean;
  onPress?: () => void;
}

/**
 * List row matching the visual style of the home-screen "recent" list:
 * leading slot (avatar/icon), title + subtitle, optional trailing text,
 * chevron, and a hairline divider unless `isLast`.
 */
export function RecentListRow({
  leading,
  title,
  subtitle,
  trailing,
  isLast,
  onPress,
}: RecentListRowProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !isLast && styles.rowBorder]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
      <Ionicons name="chevron-forward" size={14} color={theme.colors.borderStrong ?? '#D3D1C7'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  leading: { marginRight: 14 },
  body: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  trailing: {
    fontSize: 12,
    color: '#B4B2A9',
    marginLeft: 8,
    marginRight: 4,
  },
});
