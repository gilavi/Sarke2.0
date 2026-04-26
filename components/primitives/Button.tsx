import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptic } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  title: string;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  onPress?: () => void;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white',
  secondary: 'bg-white border border-hairline text-ink',
  danger: 'bg-danger text-white',
};

export function Button({
  title,
  variant = 'primary',
  disabled,
  loading,
  iconLeft,
  iconRight,
  onPress,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(0.9, { damping: 15, stiffness: 400 });
    haptic.light();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      className={`
        h-14 min-h-[56px] rounded-xl flex-row items-center justify-center gap-2 px-4
        ${variantClasses[variant]}
        ${disabled || loading ? 'opacity-50' : ''}
      `}
      style={animatedStyle}
    >
      {iconLeft}
      <Text className={`text-base font-semibold ${variant === 'primary' || variant === 'danger' ? 'text-white' : 'text-ink'}`}>
        {loading ? 'იტვირთება…' : title}
      </Text>
      {iconRight}
    </AnimatedPressable>
  );
}
