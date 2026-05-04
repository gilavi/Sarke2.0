import { StyleSheet, Pressable, View } from 'react-native';
import Svg, { Circle, Path, Ellipse } from 'react-native-svg';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

function HardHatIllustration() {
  return (
    <Svg width="88" height="88" viewBox="0 0 88 88">
      {/* Background disc */}
      <Circle cx="44" cy="44" r="42" fill="#E1F5EE" />
      {/* Hard hat dome */}
      <Path d="M16 54 Q16 26 44 23 Q72 26 72 54 Z" fill="#1D9E75" />
      {/* Dome highlight (inner lighter arc) */}
      <Path d="M22 54 Q22 32 44 29 Q66 32 66 54 Z" fill="#25B589" opacity="0.30" />
      {/* Brim */}
      <Ellipse cx="44" cy="54" rx="30" ry="5.5" fill="#1D9E75" />
      {/* Question mark — arc */}
      <Path
        d="M40 37 Q40 32 44 32 Q48 32 48 36.5 Q48 40 44 41.5 L44 44"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Question mark — dot */}
      <Circle cx="44" cy="47.5" r="1.6" fill="white" />
    </Svg>
  );
}

interface Props {
  title?: string;
  subtitle?: string;
  onGoHome?: () => void;
  onRetry?: () => void;
}

export function ErrorScreen({
  title = 'რაღაც არასწორად მოხდა',
  subtitle = 'ეს გვერდი ვერ იტვირთა. სცადეთ თავიდან ან დაბრუნდით მთავარ გვერდზე.',
  onGoHome,
  onRetry,
}: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <HardHatIllustration />
      <Text style={[styles.title, { color: theme.colors.ink }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.inkSoft }]}>{subtitle}</Text>

      {onGoHome && (
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.colors.accent }]}
          onPress={onGoHome}
          {...a11y('მთავარ გვერდზე დაბრუნება', 'შეეხეთ მთავარ გვერდზე დასაბრუნებლად', 'button')}
        >
          <Text style={styles.primaryBtnText}>მთავარ გვერდზე დაბრუნება</Text>
        </Pressable>
      )}

      {onRetry && (
        <Pressable
          style={[styles.secondaryBtn, { borderColor: theme.colors.accent }]}
          onPress={onRetry}
          {...a11y('სცადე თავიდან', 'შეეხეთ ხელახლა ცდისთვის', 'button')}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.colors.accent }]}>
            სცადე თავიდან
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  primaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryBtn: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
