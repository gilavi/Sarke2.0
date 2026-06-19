import React, { ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { haptic } from '../../lib/haptics';
import { usePressBounce } from './usePressBounce';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressBounceProps extends Omit<PressableProps, 'children' | 'style' | 'onPress'> {
  children: ReactNode;
  /** Squish target. Full-width rows/triggers ~0.97–0.98, chips ~0.94 (default), keypad keys ~0.90. */
  scaleTo?: number;
  /** Haptic fired on press (before onPress). Omit when the caller's onPress already fires one. */
  hapticOnPress?: keyof typeof haptic;
  /** Style for the Pressable ITSELF — borders/background scale WITH the press. */
  style?: StyleProp<ViewStyle>;
  onPress?: (e: GestureResponderEvent) => void;
}

/**
 * PressBounce — the canonical tappable wrapper carrying the DS press feel.
 *
 * Composes {@link usePressBounce} (squish → bouncy spring, one-shot, reduce-motion
 * aware) onto an `AnimatedPressable`, applying the transform to the Pressable
 * ITSELF — so a bordered chip/row scales as a single unit (border + fill), matching
 * `IconButton`. Use this for any tap target that isn't already a Button / IconButton /
 * FabButton / StatusChip (those call `usePressBounce` directly).
 *
 * Selection / active styling stays prop-driven via `style`; this only adds the press
 * feel. For the "option became selected" spring, pair the indicator with
 * {@link useSelectionPop}.
 *
 * @example
 *   <PressBounce style={[styles.chip, active && styles.chipActive]} onPress={select}>
 *     <Text>…</Text>
 *   </PressBounce>
 */
export function PressBounce({
  children,
  scaleTo = 0.94,
  hapticOnPress,
  style,
  onPress,
  disabled,
  ...rest
}: PressBounceProps) {
  const { pressStyle, bounce } = usePressBounce(scaleTo);

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    bounce(); // reduce-motion handled inside the hook
    if (hapticOnPress) haptic[hapticOnPress]();
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      style={[style, pressStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
