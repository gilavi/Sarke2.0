/**
 * Shared "შემოთავაზება" banner for inspection conclusion steps - a Lightbulb +
 * hint text that surfaces the auto-computed verdict suggestion. When `onApply`
 * is provided the whole banner is pressable (tapping adopts the suggestion).
 *
 * Consolidates the six previously-inline copies (forklift, cargo-platform,
 * mobile-ladder, lifting-accessories, safety-net, fall-protection).
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

export interface VerdictSuggestionBannerProps {
  /** Full banner text, e.g. "შემოთავაზება: გამართულია". */
  text: string;
  /** When provided, the banner becomes a button that adopts the suggestion. */
  onApply?: () => void;
}

export function VerdictSuggestionBanner({ text, onApply }: VerdictSuggestionBannerProps) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const inner = (
    <>
      <Lightbulb size={16} color={theme.colors.warn} strokeWidth={1.5} />
      <Text style={styles.text}>{text}</Text>
    </>
  );

  if (onApply) {
    return (
      <Pressable
        style={styles.banner}
        onPress={onApply}
        {...a11y(text, 'შეეხეთ შემოთავაზებული გადაწყვეტილების მისაღებად', 'button')}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.banner}>{inner}</View>;
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.warnSoft,
      borderRadius: 10,
      padding: 10,
    },
    text: { flex: 1, fontSize: 12, color: theme.colors.inkSoft },
  });
}
