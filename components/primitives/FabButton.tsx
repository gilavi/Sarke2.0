import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';
import { usePressBounce } from '../animations/usePressBounce';

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
 * Shared floating action button. 60x60 circle, accent background with glow
 * shadow. Pass `iconRotation` (degrees) to animate the icon (e.g. 45 for a
 * x close state). Shares the canonical press bounce with every button.
 */
export const FabButton = React.forwardRef<View, FabButtonProps>(function FabButton(
  { onPress, icon: Icon = Plus, iconRotation = 0, a11yLabel, a11yHint, style },
  ref,
) {
  const { theme } = useTheme();
  const { pressStyle, bounce } = usePressBounce();

  const handlePress = () => {
    bounce();
    // The FAB is the screen's primary create/add action → Medium.
    haptic.medium();
    onPress();
  };

  return (
    <Pressable
      ref={ref as any}
      onPress={handlePress}
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
          pressStyle,
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
