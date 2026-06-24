import { StyleSheet, Pressable, View } from 'react-native';
import Svg, { Circle, Path, Ellipse } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

function HardHatIllustration() {
  return (
    <Svg width="88" height="88" viewBox="0 0 88 88">
      {/* Background disc - soft primary wash */}
      <Circle cx="44" cy="44" r="42" fill="#FFF3EE" />
      {/* Hard hat dome - brand orange */}
      <Path d="M16 54 Q16 26 44 23 Q72 26 72 54 Z" fill="#FF6D2E" />
      {/* Dome highlight (inner lighter arc) */}
      <Path d="M22 54 Q22 32 44 29 Q66 32 66 54 Z" fill="#FF8A57" opacity="0.45" />
      {/* Brim - deeper orange for depth */}
      <Ellipse cx="44" cy="54" rx="30" ry="5.5" fill="#E85510" />
      {/* Question mark - arc */}
      <Path
        d="M40 37 Q40 32 44 32 Q48 32 48 36.5 Q48 40 44 41.5 L44 44"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Question mark - dot */}
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
  title,
  subtitle,
  onGoHome,
  onRetry,
}: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const resolvedTitle = title ?? t('components.errorScreenTitle');
  const resolvedSubtitle = subtitle ?? t('components.errorScreenSubtitle');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <HardHatIllustration />
      <Text style={[styles.title, { color: theme.colors.ink }]}>{resolvedTitle}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.inkSoft }]}>{resolvedSubtitle}</Text>

      {onGoHome && (
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.colors.accent }]}
          onPress={onGoHome}
          {...a11y(t('components.goHome'), t('components.goHome'), 'button')}
        >
          <Text style={styles.primaryBtnText}>{t('components.goHome')}</Text>
        </Pressable>
      )}

      {onRetry && (
        <Pressable
          style={[styles.secondaryBtn, { borderColor: theme.colors.accent }]}
          onPress={onRetry}
          {...a11y(t('components.tryAgain'), t('components.tryAgain'), 'button')}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.colors.accent }]}>
            {t('components.tryAgain')}
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
