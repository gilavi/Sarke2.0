import { ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
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
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
      <ChevronRight size={14} color={theme.colors.borderStrong} strokeWidth={1.5} />
    </Pressable>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    rowBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.hairline,
    },
    leading: { marginRight: 14 },
    body: { flex: 1 },
    title: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.ink,
      lineHeight: 20,
      marginBottom: 3,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.inkFaint,
      fontWeight: '400',
    },
    trailing: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      marginLeft: 8,
      marginRight: 4,
    },
  });
}
