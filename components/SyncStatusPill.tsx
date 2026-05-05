import { useEffect, useRef, useState , useMemo} from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOffline } from '../lib/offline';
import { useTheme } from '../lib/theme';

import { haptic } from '../lib/haptics';

/**
 * Small pill shown near the top-right when offline-queue `pendingCount > 0`.
 * Tapping it triggers a manual `flush()`. Fades to "success" state briefly after
 * the queue drains, then hides.
 */
export function SyncStatusPill() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const { pendingCount, isOnline, netReady, flush } = useOffline();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const [mode, setMode] = useState<'hidden' | 'pending' | 'success'>('hidden');
  const prevCountRef = useRef(pendingCount);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = pendingCount;

    if (pendingCount > 0) {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
        successTimer.current = null;
      }
      setMode('pending');
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else if (prev > 0 && pendingCount === 0) {
      setMode('success');
      successTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
          setMode('hidden');
        });
        successTimer.current = null;
      }, 1000);
    }
  }, [pendingCount, opacity]);

  useEffect(
    () => () => {
      if (successTimer.current) clearTimeout(successTimer.current);
      opacity.stopAnimation();
    },
    [],
  );

  if (!netReady) return null;
  if (mode === 'hidden') return null;

  const label =
    mode === 'success'
      ? 'სინქრონიზებულია'
      : `${pendingCount} ცვლილება სინქრონიზდება`;
  const icon: keyof typeof Ionicons.glyphMap =
    mode === 'success' ? 'checkmark-circle' : isOnline ? 'sync' : 'cloud-offline-outline';
  const bg = mode === 'success' ? theme.colors.accent : theme.colors.ink;

  const onPress = () => {
    if (mode !== 'pending' || !isOnline) return;
    haptic.light();
    void flush();
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + (Platform.OS === 'ios' ? 4 : 30) }]}>
      <Animated.View style={{ opacity }}>
        <Pressable
          onPress={onPress}
          disabled={mode !== 'pending' || !isOnline}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ busy: mode === 'pending' }}
          hitSlop={8}
          style={({ pressed }) => [styles.pill, { backgroundColor: bg }, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name={icon} size={14} color={theme.colors.white} />
          <Text style={styles.text}>{label}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
    left: 16,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
}
