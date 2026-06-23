import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';
import { HeaderBackButton } from './HeaderBackButton';

interface Props {
  title: string;
  /** Defaults to `router.back()` (via {@link HeaderBackButton}). */
  onBack?: () => void;
  /**
   * Trailing control(s) rendered on the right (e.g. a delete / share button).
   * Replaces the invisible 38px spacer that otherwise balances the back button
   * so the title stays optically centered.
   */
  right?: ReactNode;
  /** Header surface color. Defaults to the app background. */
  surfaceColor?: string;
}

/**
 * In-content header for **non-flow stacked screens** (record detail / preview /
 * list screens reached by a push). Renders our circular {@link HeaderBackButton}
 * + a centered 17px title, sitting on a flat themed surface inside the screen
 * body — the canonical replacement for the native `<Stack.Screen headerShown>`
 * bar, which on iOS draws a translucent "glass" container we don't want.
 *
 * Pair with `<Stack.Screen options={{ headerShown: false }} />`. For multi-step
 * inspection / briefing / incident *flows* (project subtitle + progress bar) use
 * `FlowHeader` instead.
 */
export function ScreenHeader({ title, onBack, right, surfaceColor }: Props) {
  const { theme } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: surfaceColor ?? theme.colors.background }}>
      <View style={styles.row}>
        <HeaderBackButton onPress={onBack} />
        <Text style={[styles.title, { color: theme.colors.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {right ? <View style={styles.right}>{right}</View> : <View style={styles.spacer} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  right: {
    minWidth: 38,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  spacer: { width: 38 },
});
