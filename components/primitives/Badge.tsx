import React from 'react';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../lib/theme';
import { useAccessibilitySettings } from '../../lib/accessibility';
import { A11yText } from './A11yText';


export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', pulse, size = 'sm' }: BadgeProps) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const scale = useSharedValue(1);

  // Hooks must run unconditionally (Rules of Hooks) — gate the animation
  // INSIDE the effect, never wrap the hook in an `if`. Reduce-motion users
  // get a static badge, matching the DS animation hooks (usePressBounce).
  React.useEffect(() => {
    if (!pulse || reduceMotion) return;
    scale.value = withRepeat(withTiming(1.15, { duration: 800 }), -1, true);
    return () => {
      cancelAnimation(scale);
      scale.value = 1;
    };
  }, [pulse, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyles = {
    default: { bg: theme.colors.surfaceSecondary, text: theme.colors.inkSoft },
    primary: { bg: theme.colors.accentSoft, text: theme.colors.accent },
    // successStrong/warningStrong keep the 11px text AA-readable on the soft
    // fills (the base success/warning hues are ~2:1 on them in light mode).
    success: { bg: theme.colors.semantic.successSoft, text: theme.colors.semantic.successStrong },
    warning: { bg: theme.colors.semantic.warningSoft, text: theme.colors.semantic.warningStrong },
    danger: { bg: theme.colors.semantic.dangerSoft, text: theme.colors.semantic.danger },
    info: { bg: theme.colors.semantic.infoSoft, text: theme.colors.semantic.info },
  };

  const v = variantStyles[variant];
  const isSm = size === 'sm';

  return (
    <Animated.View
      style={[
        {
          backgroundColor: v.bg,
          paddingHorizontal: isSm ? 8 : 12,
          paddingVertical: isSm ? 3 : 6,
          borderRadius: theme.radius.full,
          alignSelf: 'flex-start',
        },
        pulse && animatedStyle,
      ]}
    >
      <A11yText size={isSm ? 'xs' : 'sm'} weight="semibold" color={v.text}>
        {children}
      </A11yText>
    </Animated.View>
  );
}
