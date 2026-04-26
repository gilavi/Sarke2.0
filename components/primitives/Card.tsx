import React, { ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { haptic } from '../../lib/haptics';
import { theme } from '../../lib/theme';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost' | 'gradient';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding | number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm: theme.space(3),
  md: theme.space(4),
  lg: theme.space(5),
  xl: theme.space(6),
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  style,
}: CardProps) {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue<number>(
    variant === 'elevated' ? theme.shadows.md.shadowOpacity : theme.shadows.sm.shadowOpacity
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withTiming(0.98, { duration: 80 });
      shadowOpacity.value = withTiming(theme.shadows.lg.shadowOpacity, { duration: 80 });
      haptic.light();
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, theme.motion.spring.gentle);
    shadowOpacity.value = withSpring(
      variant === 'elevated' ? theme.shadows.md.shadowOpacity : theme.shadows.sm.shadowOpacity,
      theme.motion.spring.gentle
    );
  };

  const variantStyles = {
    default: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadow: theme.shadows.sm,
    },
    elevated: {
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 0,
      borderColor: 'transparent',
      shadow: theme.shadows.md,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: theme.colors.borderStrong,
      shadow: theme.shadows.none,
    },
    ghost: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderWidth: 0,
      borderColor: 'transparent',
      shadow: theme.shadows.none,
    },
    gradient: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadow: theme.shadows.sm,
    },
  };

  const v = variantStyles[variant];

  const content = (
    <Animated.View
      style={[
        {
          backgroundColor: v.backgroundColor,
          borderRadius: theme.radius.lg,
          borderWidth: v.borderWidth,
          borderColor: v.borderColor,
          padding: typeof padding === 'number' ? padding : paddingMap[padding],
        },
        v.shadow,
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
