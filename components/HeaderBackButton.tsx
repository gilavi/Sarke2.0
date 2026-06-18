import { Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

interface Props {
  /** Defaults to `router.back()`. */
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * Circular, icon-only back button shared by flow headers (`FlowHeader`) and
 * stacked screens that render their own header (e.g. `app/qualifications`).
 * Keeps the 38px circle + 1.5px border + ChevronLeft treatment in one place
 * so screens don't reinvent it with drifting sizes.
 */
export function HeaderBackButton({ onPress, disabled }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const handle = onPress ?? (() => router.back());
  return (
    <Pressable
      hitSlop={11}
      disabled={disabled}
      onPress={handle}
      style={({ pressed }) => [
        styles.btn,
        { borderColor: theme.colors.border },
        disabled && { opacity: 0.35 },
        pressed && !disabled && { opacity: 0.6 },
      ]}
      {...a11y('უკან', 'წინა ეკრანზე დაბრუნება', 'button')}
    >
      <ChevronLeft
        size={22}
        color={disabled ? theme.colors.inkFaint : theme.colors.ink}
        strokeWidth={1.5}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
