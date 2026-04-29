import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

interface Props {
  /** Override the visible label. Defaults to "უკან". */
  label?: string;
  onPress?: () => void;
}

/**
 * Minimal "< უკან" header-left used across the app. No pill background, no
 * iOS rounded chip — just an accent-tinted chevron + label. Visually matches
 * the back button inside FlowHeader so the rest of the app reads the same.
 */
export function HeaderBackPill({ label = 'უკან', onPress }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const handle = onPress ?? (() => router.back());
  return (
    <Pressable
      hitSlop={10}
      onPress={handle}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 4,
          paddingRight: 6,
          marginLeft: -2,
        },
        pressed && { opacity: 0.6 },
      ]}
      {...a11y(label, 'წინა ეკრანზე დაბრუნება', 'button')}
    >
      <Ionicons name="chevron-back" size={18} color={theme.colors.accent} />
      <Text style={{ color: theme.colors.accent, fontSize: 15, fontWeight: '500', marginLeft: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}
