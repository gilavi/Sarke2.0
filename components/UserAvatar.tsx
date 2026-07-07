import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { A11yText } from './primitives/A11yText';
import { useTheme } from '../lib/theme';

/**
 * First letter of the user's first + last name (fallback: first letter of the
 * email), uppercased with the Georgian locale. `Array.from` splits by code
 * point so emoji / surrogate pairs aren't cut in half. Returns `'-'` when
 * nothing is available.
 */
export function userInitials(
  user:
    | { first_name?: string | null; last_name?: string | null; email?: string | null }
    | null
    | undefined,
): string {
  const parts = [user?.first_name, user?.last_name]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .map((p) => Array.from(p)[0]);
  const email = (user?.email ?? '').trim();
  const text = parts.join('') || (email ? Array.from(email)[0] : '');
  return (text || '-').toLocaleUpperCase('ka-GE');
}

/**
 * Deterministic, fully local avatar for the CURRENT user: initials on a quiet
 * themed disc. The single owner of the "signed-in user" identity mark in app
 * chrome — the tab bar and the More profile card both render this, so the
 * mark can't drift. Replaced the old dicebear network avatar: boot-critical
 * chrome must never fetch from an external host (offline first-launch drew an
 * empty circle, and the tab bar had an availability dependency on
 * api.dicebear.com). No network, no new deps, theme-aware.
 */
export function UserAvatar({
  user,
  size = 44,
  borderWidth,
  borderColor,
  style,
}: {
  user:
    | { first_name?: string | null; last_name?: string | null; email?: string | null }
    | null
    | undefined;
  size?: number;
  /** Ring width; defaults to a hairline. The tab bar passes its focus ring. */
  borderWidth?: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.subtleSurface,
          borderWidth: borderWidth ?? StyleSheet.hairlineWidth,
          borderColor: borderColor ?? theme.colors.hairline,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <A11yText
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={{
          color: theme.colors.ink,
          fontWeight: '700',
          fontSize: Math.round(size * 0.36),
          lineHeight: Math.round(size * 0.44),
          textAlign: 'center',
        }}
      >
        {userInitials(user)}
      </A11yText>
    </View>
  );
}
