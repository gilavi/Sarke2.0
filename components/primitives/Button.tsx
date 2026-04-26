import React from 'react';
import { Pressable, PressableProps, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../../lib/haptics';
import { theme } from '../../lib/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  /** @deprecated Use leftIcon (string) instead */
  iconLeft?: React.ReactNode;
  /** @deprecated Use rightIcon (string) instead */
  iconRight?: React.ReactNode;
  onPress?: () => void;
  style?: any;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  leftIcon,
  rightIcon,
  iconLeft,
  iconRight,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 80 });
    haptic.light();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, theme.motion.spring.gentle);
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress?.();
    }
  };

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.radius.sm },
    md: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: theme.radius.md },
    lg: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: theme.radius.lg },
    xl: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: theme.radius.xl },
  };

  const textSizes = {
    sm: { fontSize: 13 },
    md: { fontSize: 15 },
    lg: { fontSize: 16 },
    xl: { fontSize: 17 },
  };

  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.accent,
      color: '#FFFFFF',
      shadow: theme.shadows.glow,
      borderColor: undefined as string | undefined,
      borderWidth: undefined as number | undefined,
      textDecorationLine: undefined as string | undefined,
    },
    secondary: {
      backgroundColor: theme.colors.surfaceSecondary,
      color: theme.colors.ink,
      shadow: theme.shadows.sm,
      borderColor: undefined as string | undefined,
      borderWidth: undefined as number | undefined,
      textDecorationLine: undefined as string | undefined,
    },
    ghost: {
      backgroundColor: theme.colors.accentSoft,
      color: theme.colors.accent,
      shadow: theme.shadows.none,
      borderColor: undefined as string | undefined,
      borderWidth: undefined as number | undefined,
      textDecorationLine: undefined as string | undefined,
    },
    outline: {
      backgroundColor: 'transparent',
      color: theme.colors.accent,
      borderColor: theme.colors.accent,
      borderWidth: 1.5,
      shadow: theme.shadows.none,
      textDecorationLine: undefined as string | undefined,
    },
    danger: {
      backgroundColor: theme.colors.semantic.dangerSoft,
      color: theme.colors.semantic.danger,
      shadow: theme.shadows.none,
      borderColor: undefined as string | undefined,
      borderWidth: undefined as number | undefined,
      textDecorationLine: undefined as string | undefined,
    },
    link: {
      backgroundColor: 'transparent',
      color: theme.colors.accent,
      shadow: theme.shadows.none,
      textDecorationLine: 'underline',
      borderColor: undefined as string | undefined,
      borderWidth: undefined as number | undefined,
    },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <Animated.View style={[animatedStyle, v.shadow, { borderRadius: s.borderRadius }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[
          styles.base,
          s,
          { backgroundColor: v.backgroundColor },
          v.borderColor ? { borderColor: v.borderColor, borderWidth: v.borderWidth } : null,
          (disabled || loading) && styles.disabled,
          style,
        ]}
        {...rest}
      >
        {(leftIcon || iconLeft) && (
          <View style={{ marginRight: 8 }}>
            {iconLeft ?? (
              <Ionicons
                name={leftIcon}
                size={textSizes[size].fontSize + 2}
                color={v.color}
              />
            )}
          </View>
        )}
        <Text
          style={[
            styles.text,
            textSizes[size],
            { color: v.color, fontWeight: '600' },
            v.textDecorationLine ? { textDecorationLine: v.textDecorationLine as any } : undefined,
          ]}
        >
          {title}
        </Text>
        {(rightIcon || iconRight) && (
          <View style={{ marginLeft: 8 }}>
            {iconRight ?? (
              <Ionicons
                name={rightIcon}
                size={textSizes[size].fontSize + 2}
                color={v.color}
              />
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: theme.typography.fontFamily.bodySemiBold,
  },
  disabled: {
    opacity: 0.5,
  },
});
