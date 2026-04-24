import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import { friendlyError } from '../lib/errorMap';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}

export function ErrorState({
  title = 'ვერ ჩაიტვირთა',
  message,
  error,
  onRetry,
  retrying,
  icon = 'cloud-offline-outline',
  compact,
}: ErrorStateProps) {
  const body = message ?? friendlyError(error);
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, compact && styles.wrapCompact]}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={compact ? 24 : 32} color={theme.colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityLabel="ხელახლა ცდა"
          accessibilityState={{ disabled: !!retrying, busy: !!retrying }}
          hitSlop={8}
          style={({ pressed }) => [
            styles.retry,
            pressed && { opacity: 0.85 },
            retrying && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="refresh" size={16} color={theme.colors.accent} />
          <Text style={styles.retryText}>{retrying ? 'იტვირთება…' : 'ხელახლა ცდა'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  wrapCompact: {
    paddingVertical: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    maxWidth: 320,
  },
  retry: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
  },
  retryText: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
});
