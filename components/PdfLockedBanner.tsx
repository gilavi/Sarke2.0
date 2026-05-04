import { Pressable, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';

interface Props {
  onSubscribe: () => void;
}

/**
 * Inline amber banner shown at the top of screens when the user's PDF limit
 * is exhausted. Tapping the subscribe button opens the PaywallModal.
 */
export function PdfLockedBanner({ onSubscribe }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.banner}>
      <Text style={s.label}>🔒 PDF ლიმიტი ამოიწურა · გამოიწერე პრო</Text>
      <Pressable
        onPress={onSubscribe}
        style={({ pressed }) => [s.btn, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="გამოწერა"
        hitSlop={8}
      >
        <Text style={s.btnText}>გამოწერა →</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.warnSoft,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.warn,
      paddingHorizontal: 14,
      paddingVertical: 9,
      gap: 8,
    },
    label: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.ink,
      fontWeight: '500',
    },
    btn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: theme.colors.warn,
    },
    btnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    pressed: {
      opacity: 0.75,
    },
  });
