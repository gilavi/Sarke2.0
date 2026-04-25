import { ReactNode } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../lib/haptics';
import { theme } from '../lib/theme';

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({
  children,
  style,
  padding = 16,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  return <View style={[styles.card, { padding }, theme.shadow.card, style]}>{children}</View>;
}

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger' | 'secondary';
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  loading,
  variant = 'primary',
  style,
  iconLeft,
  iconRight,
  onPress,
  ...rest
}: ButtonProps & {
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}) {
  return (
    <Pressable
      {...rest}
      disabled={rest.disabled || loading}
      onPress={e => {
        haptic.light();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        variant === 'secondary' && styles.buttonSecondary,
        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
        (rest.disabled || loading) && { opacity: 0.6 },
        variant === 'primary' && theme.shadow.button,
        (iconLeft || iconRight) ? { flexDirection: 'row', gap: 8, alignItems: 'center' } : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.white : theme.colors.accent} />
      ) : (
        <>
          {iconLeft}
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
          {iconRight}
        </>
      )}
    </Pressable>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label.toUpperCase()}</Label>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={theme.colors.inkFaint}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function Chip({
  children,
  tint = theme.colors.accent,
  bg = theme.colors.accentSoft,
}: {
  children: ReactNode;
  tint?: string;
  bg?: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
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
    return <Text style={styles.sectionHeader}>{title}</Text>;
  }
  return (
    <View style={sectionHeaderStyles.row}>
      <Text style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>{title}</Text>
      <Pressable onPress={action.onPress} hitSlop={8}>
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
  return <Text style={styles.errorText}>{children}</Text>;
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
