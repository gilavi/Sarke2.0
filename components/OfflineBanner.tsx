import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOffline } from '../lib/offline';
import { theme } from '../lib/theme';

export function OfflineBanner() {
  const { isOnline, netReady, pendingCount } = useOffline();
  const insets = useSafeAreaInsets();
  // Don't show anything until NetInfo has reported at least once — prevents
  // the "online → offline" flash on cold start when the device has no signal.
  if (!netReady) return null;
  if (isOnline && pendingCount === 0) return null;

  const offline = !isOnline;
  const text = offline
    ? 'ხაზგარეშე — ცვლილებები ინახება ლოკალურად'
    : `სინქრონიზაცია... (${pendingCount})`;
  const bg = offline ? theme.colors.warn : theme.colors.harnessTint;

  return (
    <View style={{ backgroundColor: bg, paddingTop: insets.top }}>
      <Text
        style={{
          color: theme.colors.white,
          textAlign: 'center',
          paddingVertical: 6,
          paddingHorizontal: 12,
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        {text}
      </Text>
    </View>
  );
}
