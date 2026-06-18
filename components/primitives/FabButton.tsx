import React, { useCallback } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

interface FabButtonProps {
  onPress: () => void;
  icon?: LucideIcon;
  iconRotation?: number;
  a11yLabel: string;
  a11yHint?: string;
  style?: StyleProp<ViewStyle>;
  viewRef?: React.RefObject<View>;
}

/**
 * Shared floating action button. 60x60 circle, accent background with green
 * glow shadow. Pass `iconRotation` (degrees) to animate the icon (e.g. 45 for
 * a x close state).
 */
export const FabButton = React.forwardRef<View, FabButtonProps>(function FabButton(
  { onPress, icon: Icon = Plus, iconRotation = 0, a11yLabel, a11yHint, style },
  ref,
) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withSpring(1, { stiffness: 300, damping: 10 }),
    );
  }, []);

  return (
    <Pressable
      ref={ref as any}
      onPress={onPress}
      onPressIn={handlePressIn}
      style={[
        {
          position: 'absolute',
          right: 20,
          bottom: 24,
          zIndex: 50,
        },
        style,
      ]}
      {...a11y(a11yLabel, a11yHint, 'button')}
    >
      <Animated.View
        style={[
          {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.45,
            shadowRadius: 12,
            elevation: 10,
          },
          animatedStyle,
        ]}
      >
        <Icon
          size={28}
          color={theme.colors.white}
          strokeWidth={1.5}
          style={iconRotation !== 0 ? { transform: [{ rotate: `${iconRotation}deg` }] } : undefined}
        />
      </Animated.View>
    </Pressable>
  );
});
