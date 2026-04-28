import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOffline } from '../lib/offline';
import { useTheme } from '../lib/theme';

export function OfflineBanner() {
  const { theme } = useTheme();
  const { isOnline, netReady } = useOffline();
  const insets = useSafeAreaInsets();
  // Don't show anything until NetInfo has reported at least once — prevents
  // the "online → offline" flash on cold start when the device has no signal.
  if (!netReady) return null;
  if (isOnline) return null;

  const text = 'ხაზგარეშე — ცვლილებები ინახება ლოკალურად';
  const bg = theme.colors.warn;

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
