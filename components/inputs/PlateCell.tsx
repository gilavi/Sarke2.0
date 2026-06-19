import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAccessibilitySettings } from '../../lib/accessibility';
import type { Theme } from '../../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PlateCellProps {
  ch: string;
  isActive: boolean;
  slotKind: 'letter' | 'digit';
  customKeyboard?: boolean;
  onPress: () => void;
  onChangeText: (t: string) => void;
  onKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  onFocus: () => void;
  onBlur: () => void;
  inputRef: (r: TextInput | null) => void;
  theme: Theme;
}

/**
 * One license-plate cell, extracted so each cell owns its own animated border
 * shared value. The active cell's ink border fades in (no reflow — the 2px border
 * is always present; at rest it's painted `subtleSurface` so it blends into the
 * cell fill, then tweens to ink). The empty-cell caret fades in once. No
 * press-bounce: a cell tap is a focus action, not a discrete press. Honours
 * reduce-motion (jumps straight to the final border, no caret fade).
 */
export function PlateCell({
  ch,
  isActive,
  slotKind,
  customKeyboard,
  onPress,
  onChangeText,
  onKeyPress,
  onFocus,
  onBlur,
  inputRef,
  theme,
}: PlateCellProps) {
  const { reduceMotion } = useAccessibilitySettings();
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? (isActive ? 1 : 0)
      : withTiming(isActive ? 1 : 0, { duration: theme.motion.fast });
  }, [isActive, reduceMotion, theme, progress]);

  const animStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [theme.colors.subtleSurface, theme.colors.ink],
    ),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.cell, { backgroundColor: theme.colors.subtleSurface }, animStyle]}
    >
      {ch ? (
        <Text style={[styles.cellText, { color: theme.colors.ink }]}>{ch}</Text>
      ) : isActive ? (
        <Animated.Text
          entering={reduceMotion ? undefined : FadeIn.duration(theme.motion.fast)}
          style={[styles.cellText, { color: theme.colors.inkFaint }]}
        >
          ·
        </Animated.Text>
      ) : null}
      {!customKeyboard && (
        <TextInput
          ref={inputRef}
          value={ch}
          onChangeText={onChangeText}
          onKeyPress={onKeyPress}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardType={slotKind === 'digit' ? 'number-pad' : 'default'}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={1}
          selectTextOnFocus
          caretHidden
          style={styles.hiddenInput}
        />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: 40,
    height: 52,
    borderRadius: 10,
    // Transparent-equivalent (subtleSurface) border at rest so the active ink
    // border doesn't shift layout.
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellText: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
