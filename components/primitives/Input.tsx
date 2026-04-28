import React, {useState, useMemo} from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';


interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  onFocus,
  onBlur,
  required,
  ...rest
}: InputProps & { required?: boolean }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [isFocused, setIsFocused] = useState(false);
  const borderColor = useSharedValue<string>(theme.colors.border);
  const shake = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
    transform: [{ translateX: shake.value }],
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    borderColor.value = withTiming(theme.colors.accent, { duration: 150 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    borderColor.value = withTiming(error ? theme.colors.semantic.danger : theme.colors.border, {
      duration: 150,
    });
    onBlur?.(e);
  };

  // Shake animation on error
  React.useEffect(() => {
    if (error) {
      shake.value = withSpring(0, { damping: 10, stiffness: 400 });
      const sequence = [10, -10, 8, -8, 5, -5, 0];
      let delay = 0;
      sequence.forEach((val, i) => {
        setTimeout(() => {
          shake.value = withTiming(val, { duration: 50 });
        }, delay);
        delay += 60;
      });
      haptic.error();
    }
  }, [error]);

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: theme.colors.semantic.danger }}> *</Text>}
        </Text>
      )}
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          {
            backgroundColor: theme.colors.surface,
            borderWidth: 1.5,
            borderRadius: theme.radius.md,
          },
          style,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={isFocused ? theme.colors.accent : theme.colors.inkFaint}
            style={{ marginRight: 10 }}
          />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={theme.colors.inkFaint}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} hitSlop={8}>
            <Ionicons
              name={rightIcon}
              size={18}
              color={theme.colors.inkSoft}
              style={{ marginLeft: 10 }}
            />
          </Pressable>
        )}
      </Animated.View>
      {error && <Text style={styles.error}>{error}</Text>}
      {helper && !error && <Text style={styles.helper}>{helper}</Text>}
    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  wrapper: {
    marginBottom: theme.space(4),
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.inkSoft,
    marginBottom: theme.space(2),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily.body,
    padding: 0,
  },
  error: {
    fontSize: 12,
    color: theme.colors.semantic.danger,
    marginTop: theme.space(2),
  },
  helper: {
    fontSize: 12,
    color: theme.colors.inkFaint,
    marginTop: theme.space(2),
  },
});
}
