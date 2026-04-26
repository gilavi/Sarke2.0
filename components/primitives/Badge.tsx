import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../../lib/theme';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', pulse, size = 'sm' }: BadgeProps) {
  const scale = useSharedValue(1);

  if (pulse) {
    React.useEffect(() => {
      scale.value = withRepeat(
        withTiming(1.15, { duration: 800 }),
        -1,
        true
      );
    }, []);
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyles = {
    default: { bg: theme.colors.surfaceSecondary, text: theme.colors.inkSoft },
    primary: { bg: theme.colors.accentSoft, text: theme.colors.accent },
    success: { bg: theme.colors.semantic.successSoft, text: theme.colors.semantic.success },
    warning: { bg: theme.colors.semantic.warningSoft, text: theme.colors.semantic.warning },
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
      <Text
        style={{
          fontSize: isSm ? 11 : 13,
          fontWeight: '600',
          color: v.text,
        }}
      >
        {children}
      </Text>
    </Animated.View>
  );
}
