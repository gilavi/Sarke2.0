import React, { useMemo } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';
import { usePressBounce } from '../animations/usePressBounce';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * IconButton — the canonical icon-only button.
 *
 * Use for tappable controls that show only an icon (delete ✕, close, overflow,
 * inline remove). The text-label CTA is {@link Button}; this is its icon-only
 * sibling so those controls stop being hand-rolled `Pressable` + `<Icon>`.
 * Shares the canonical press bounce ({@link usePressBounce}) with every button.
 */
export type IconButtonVariant = 'plain' | 'ghost' | 'danger' | 'overlay' | 'outline';
export type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  /** Accessible label (required — there is no visible text). */
  a11yLabel: string;
  a11yHint?: string;
  /** plain = transparent ink · ghost = subtle surface · danger = soft red · overlay = dark scrim over images · outline = bordered circle (back/close). */
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<IconButtonSize, { box: number; icon: number }> = {
  sm: { box: 28, icon: 16 },
  md: { box: 36, icon: 20 },
  lg: { box: 44, icon: 22 },
};

export function IconButton({
  icon: Icon,
  onPress,
  a11yLabel,
  a11yHint,
  variant = 'plain',
  size = 'md',
  disabled,
  hitSlop = 8,
  style,
}: IconButtonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { pressStyle, bounce } = usePressBounce();
  const dims = SIZES[size];

  const iconColor =
    variant === 'danger'
      ? theme.colors.semantic.danger
      : variant === 'overlay'
      ? theme.colors.white
      : variant === 'outline'
      ? theme.colors.ink
      : theme.colors.inkSoft;

  const handlePress = () => {
    if (disabled) return;
    bounce();
    haptic.light();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={[
        styles.base,
        { width: dims.box, height: dims.box, borderRadius: dims.box / 2 },
        styles[variant],
        disabled && styles.disabled,
        pressStyle,
        style,
      ]}
      {...a11y(a11yLabel, a11yHint, 'button')}
    >
      <Icon size={dims.icon} color={iconColor} strokeWidth={1.8} />
    </AnimatedPressable>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    base: { alignItems: 'center', justifyContent: 'center' },
    plain: { backgroundColor: 'transparent' },
    ghost: { backgroundColor: theme.colors.surfaceSecondary },
    danger: { backgroundColor: theme.colors.semantic.dangerSoft },
    overlay: { backgroundColor: 'rgba(0,0,0,0.55)' },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.border },
    disabled: { opacity: 0.4 },
  });
}
