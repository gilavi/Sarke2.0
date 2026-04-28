import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../lib/theme';

import { haptic } from '../../lib/haptics';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const CHECK_PATH = 'M 5 12 L 10 17 L 19 7';
const CHECK_PATH_LENGTH = 26;

interface ViewProps {
  checked: boolean;
  size?: number;
  color?: string;
  uncheckedBorderColor?: string;
  uncheckedBackgroundColor?: string;
  disabled?: boolean;
}

export function AnimatedCheckboxView({
  checked,
  size = 22,
  color: colorProp,
  uncheckedBorderColor: uncheckedBorderColorProp,
  uncheckedBackgroundColor = 'transparent',
  disabled,
}: ViewProps) {
  const { theme } = useTheme();
  const color = colorProp ?? theme.colors.accent;
  const uncheckedBorderColor = uncheckedBorderColorProp ?? theme.colors.border ?? '#D8D8D8';
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [checked, progress]);

  const checkOffset = useDerivedValue(
    () => CHECK_PATH_LENGTH - CHECK_PATH_LENGTH * progress.value
  );

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [uncheckedBackgroundColor, color]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [uncheckedBorderColor, color]
    ),
  }));

  const checkAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: checkOffset.value,
    opacity: progress.value < 0.05 ? 0 : 1,
  }));

  return (
    <Animated.View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: Math.max(4, size * 0.27),
        },
        boxStyle,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.check}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <AnimatedPath
            d={CHECK_PATH}
            stroke="#FFFFFF"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK_PATH_LENGTH}
            animatedProps={checkAnimatedProps}
          />
        </Svg>
      </View>
    </Animated.View>
  );
}

interface Props extends ViewProps {
  onChange: (next: boolean) => void;
}

export function AnimatedCheckbox({ onChange, checked, disabled, ...rest }: Props) {
  const handlePress = () => {
    if (disabled) return;
    const next = !checked;
    next ? haptic.toggleOn() : haptic.toggleOff();
    onChange(next);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
    >
      <AnimatedCheckboxView checked={checked} disabled={disabled} {...rest} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  check: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
