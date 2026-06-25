// SuccessListRow — one row inside the signatures / certificates lists on the
// FlowSuccessScreen, plus the small lead visuals (avatar, empty slot, lead box).
//
// A grouped list = a surface card with a hairline border; rows are divided by a
// hairline. This mirrors the existing SuccessActionCard look (white surface +
// hairline) rather than the reference's grey fill, so it sits naturally in the
// app's warm-neutral palette. All colors come from the theme.
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Pen } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

/** Press-highlight background for a tappable row (extracted for testability). */
export const rowPressBg = (theme: Theme, pressed: boolean) =>
  pressed ? { backgroundColor: theme.colors.surfaceSecondary } : null;

/** Two-letter uppercase initials from a person's name (falls back to "?"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Filled black avatar with white initials (a signer who has signed). */
export function RowAvatar({ name }: { name: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[styles.avatar, { backgroundColor: theme.colors.ink }]}>
      <Text style={styles.avatarText}>{initials(name)}</Text>
    </View>
  );
}

/** Dashed empty avatar with a pen glyph (an unsigned / blank slot). */
export function RowEmptyAvatar() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[styles.avatar, styles.avatarEmpty]}>
      <Pen size={16} color={theme.colors.inkFaint} strokeWidth={1.5} />
    </View>
  );
}

/** Rounded-square lead box holding an accent icon (certificate / add rows). */
export function RowLead({ icon: Icon, dashed }: { icon: any; dashed?: boolean }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[styles.lead, dashed && styles.leadDashed]}>
      <Icon size={18} color={theme.colors.accent} strokeWidth={1.5} />
    </View>
  );
}

interface RowProps {
  lead: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  isFirst?: boolean;
  /** Accent-colored title (used by the "add …" rows). */
  accent?: boolean;
  a11yLabel?: string;
}

export function SuccessListRow({
  lead,
  title,
  subtitle,
  trailing,
  onPress,
  isFirst,
  accent,
  a11yLabel,
}: RowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const body = (
    <>
      {lead}
      <View style={styles.main}>
        <Text
          numberOfLines={1}
          style={[styles.title, accent && { color: theme.colors.accent }]}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, !isFirst && styles.rowDivider]}>{body}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isFirst && styles.rowDivider, rowPressBg(theme, pressed)]}
      {...a11y(a11yLabel ?? title, undefined, 'button')}
    >
      {body}
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
    },
    main: { flex: 1, minWidth: 0 },
    title: { fontSize: 15, fontWeight: '600', color: theme.colors.ink },
    subtitle: { fontSize: 13, color: theme.colors.inkFaint, marginTop: 1 },
    trailing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
    avatarEmpty: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    lead: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    leadDashed: { borderColor: theme.colors.border, borderStyle: 'dashed' },
  });
}
