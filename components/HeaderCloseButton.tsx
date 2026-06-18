import { Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

interface Props {
  onPress?: () => void;
  disabled?: boolean;
  /** hitSlop around the 38px circle. Defaults to 8. */
  hitSlop?: number;
}

/**
 * Circular, icon-only close (✕) button shared by flow headers (`FlowHeader`),
 * `SheetLayout` headers, and the map-picker overlay. Keeps the 38px circle +
 * 1.5px border + `X` treatment in one place so sheets/flows don't reinvent it
 * with drifting icon sizes/colors (the sibling of `HeaderBackButton`).
 */
export function HeaderCloseButton({ onPress, disabled, hitSlop = 8 }: Props) {
  const { theme } = useTheme();
  return (
    <Pressable
      hitSlop={hitSlop}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { borderColor: theme.colors.border },
        disabled && { opacity: 0.35 },
        pressed && !disabled && { opacity: 0.6 },
      ]}
      {...a11y('დახურვა', 'შეეხეთ დასახურად', 'button')}
    >
      <X
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
