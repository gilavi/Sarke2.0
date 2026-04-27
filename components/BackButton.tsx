import { Pressable, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

type Variant = 'inline' | 'header';

interface BackButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  style?: ViewStyle;
}

export function BackButton({ label, onPress, variant = 'inline', style }: BackButtonProps) {
  const router = useRouter();
  const handle = onPress ?? (() => router.back());
  // Unified style across the app — iOS-style chevron + accent tint. The
  // `variant` prop is kept for backward compat but no longer changes the
  // visual; it only nudges the icon size for the header context.
  const tint = theme.colors.accent;
  const iconName = 'chevron-back';
  const iconSize = variant === 'header' ? 22 : 20;

  return (
    <Pressable
      onPress={handle}
      hitSlop={10}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}
      {...a11y(`${label} — დაბრუნება`, 'გადავა წინა ეკრანზე', 'button')}
    >
      <Ionicons name={iconName as any} size={iconSize} color={tint} />
      <Text style={{ color: tint, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
