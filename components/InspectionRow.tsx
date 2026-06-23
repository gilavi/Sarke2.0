import { ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from './primitives/A11yText';
import { InspectionListAvatar } from './InspectionListAvatar';
import { useTheme, type Theme } from '../lib/theme';
import type { InspectionStatus } from './StatusBadge';
import type { a11y } from '../lib/accessibility';

type A11yProps = ReturnType<typeof a11y>;

export interface InspectionRowProps {
  /** Inspection category/source — drives the avatar illustration. */
  category?: string | null;
  /** Draft vs completed — drives the avatar status ring. */
  status?: InspectionStatus | null;
  /**
   * Override the default category avatar (e.g. a `RecordAvatar` for
   * report/order/briefing/incident rows). When set, `category`/`status` are
   * ignored. Lets every record type reuse this row's exact layout + spacing.
   */
  leading?: ReactNode;
  title: string;
  subtitle?: string | null;
  /**
   * Trailing content rendered inside the pressable, after the text block.
   * A string renders as the muted time label; any node renders as-is
   * (e.g. a chevron).
   */
  trailing?: ReactNode;
  /**
   * Actions rendered OUTSIDE the pressable (e.g. a kebab menu whose popover
   * is absolutely positioned). Kept out of the press target so taps on the
   * menu don't also navigate.
   */
  actions?: ReactNode;
  /** Render a hairline bottom divider (omit on the last row of a group). */
  showBorder?: boolean;
  /** Avatar diameter — defaults to the home-screen size (48). */
  avatarSize?: number;
  /**
   * Horizontal padding inside the row. Defaults to 20 (home, full-bleed).
   * Pass 0 when the row sits inside an already-padded card so the card's
   * gutter is the only inset and dividers span the card's inner width.
   */
  inset?: number;
  onPress?: () => void;
  a11y?: A11yProps;
}

/**
 * Canonical inspection list row, matching the home-screen "recent activity"
 * list: gray category avatar, title + subtitle, and an optional trailing slot
 * (time text or chevron). Shared by the home screen and the project-detail
 * inspections section so the two never diverge.
 *
 * Pure presentational component — no data fetching. The caller owns
 * navigation (`onPress`), swipe wrappers, and any `actions` (kebab menu).
 */
export function InspectionRow({
  category,
  status,
  leading,
  title,
  subtitle,
  trailing,
  actions,
  showBorder,
  avatarSize = 48,
  inset = 20,
  onPress,
  a11y,
}: InspectionRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.row, { paddingHorizontal: inset }]}>
      <Pressable onPress={onPress} style={styles.pressArea} {...a11y}>
        <View style={styles.avatar}>
          {leading ?? (
            <InspectionListAvatar category={category} size={avatarSize} status={status} />
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        {trailing != null
          ? typeof trailing === 'string'
            ? <Text style={styles.trailing}>{trailing}</Text>
            : trailing
          : null}
      </Pressable>
      {actions}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      backgroundColor: 'transparent',
    },
    rowBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.hairline,
    },
    pressArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: { marginRight: 14 },
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
