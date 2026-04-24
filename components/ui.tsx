import { ReactNode, useMemo } from 'react';
import {
  AccessibilityRole,
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../lib/theme';
import { haptics } from '../lib/haptics';

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({
  children,
  style,
  padding = 16,
  accessibilityLabel,
  accessibilityRole,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[styles.card, { padding }, theme.shadow.card, style]}
    >
      {children}
    </View>
  );
}

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger' | 'secondary';
  style?: StyleProp<ViewStyle>;
  /**
   * If false, disables the built-in haptic on press. Default true.
   * Primary/secondary/ghost fire `haptics.tap()`; danger fires `haptics.warning()`.
   */
  haptic?: boolean;
}

export function Button({
  title,
  loading,
  variant = 'primary',
  style,
  haptic = true,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const disabled = !!(rest.disabled || loading);
  const handlePress: PressableProps['onPress'] = e => {
    if (!disabled && haptic) {
      variant === 'danger' ? haptics.warning() : haptics.tap();
    }
    rest.onPress?.(e);
  };
  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        variant === 'secondary' && styles.buttonSecondary,
        pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
        disabled && { opacity: 0.6 },
        variant === 'primary' && theme.shadow.button,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.white : theme.colors.accent} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'primary' && { color: theme.colors.white },
            variant === 'ghost' && { color: theme.colors.accent },
            variant === 'danger' && { color: theme.colors.danger },
            variant === 'secondary' && { color: theme.colors.ink },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Label>{label.toUpperCase()}</Label>
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </View>
      {children}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </View>
  );
}

interface InputUIProps extends TextInputProps {
  error?: string;
}

export function Input({ error, accessibilityLabel, placeholder, style, ...props }: InputUIProps) {
  const a11yLabel = accessibilityLabel ?? (typeof placeholder === 'string' ? placeholder : undefined);
  return (
    <TextInput
      placeholderTextColor={theme.colors.inkFaint}
      placeholder={placeholder}
      accessible
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled: props.editable === false }}
      {...props}
      style={[styles.input, error ? styles.inputError : null, style]}
    />
  );
}

export function Chip({
  children,
  tint = theme.colors.accent,
  bg = theme.colors.accentSoft,
  accessibilityLabel,
}: {
  children: ReactNode;
  tint?: string;
  bg?: string;
  accessibilityLabel?: string;
}) {
  const label = useMemo(
    () => accessibilityLabel ?? (typeof children === 'string' ? (children as string) : undefined),
    [accessibilityLabel, children],
  );
  return (
    <View accessible accessibilityLabel={label} style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={{ color: tint, fontSize: 11, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  if (!action) {
    return (
      <Text accessibilityRole="header" style={styles.sectionHeader}>
        {title}
      </Text>
    );
  }
  return (
    <View style={sectionHeaderStyles.row}>
      <Text accessibilityRole="header" style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
        {title}
      </Text>
      <Pressable
        onPress={action.onPress}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        hitSlop={8}
      >
        <Text style={sectionHeaderStyles.action}>{action.label}</Text>
      </Pressable>
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  action: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Text accessibilityLiveRegion="polite" style={styles.errorText}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: { backgroundColor: theme.colors.accent },
  buttonGhost: { backgroundColor: theme.colors.accentSoft },
  buttonSecondary: { backgroundColor: theme.colors.subtleSurface },
  buttonDanger: { backgroundColor: theme.colors.dangerSoft },
  buttonText: { fontWeight: '600', fontSize: 16 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.inkSoft,
    letterSpacing: 0.5,
  },
  requiredMark: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.danger,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.ink,
  },
  inputError: {
    borderColor: theme.colors.danger,
    borderWidth: 1,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.inkSoft,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.danger,
  },
});
