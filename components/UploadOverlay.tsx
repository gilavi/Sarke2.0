import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme';

export interface UploadOverlayProps {
  visible: boolean;
  label?: string;
  /** Optional progress 0..1. If provided, renders an indeterminate-looking bar anchored to progress. */
  progress?: number;
}

/**
 * Full-screen dim overlay with a spinner + label. Non-dismissible while visible.
 * Supabase storage doesn't expose native progress events, so by default this is
 * just a "something is happening" indicator. Pass `progress` (0..1) if you can
 * compute it yourself (e.g. multi-file batches).
 */
export function UploadOverlay({ visible, label = 'იტვირთება…', progress }: UploadOverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View accessibilityLiveRegion="polite" accessibilityLabel={label} style={styles.card}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.label}>{label}</Text>
          {typeof progress === 'number' ? (
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.min(100, Math.max(0, Math.round(progress * 100)))}%` },
                ]}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 14,
    minWidth: 200,
    ...theme.shadow.card,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
    textAlign: 'center',
  },
  barTrack: {
    width: 160,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.subtleSurface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
  },
});
