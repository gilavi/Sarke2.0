import { View } from 'react-native';
import { A11yText as Text } from './primitives/A11yText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useOffline } from '../lib/offline';
import { useTheme } from '../lib/theme';

interface OfflineBannerProps {
  /** 'root' (default): covers safe-area top, used in tab/root layouts.
   *  'inline': no safe-area padding, low-contrast, used below a custom header. */
  variant?: 'root' | 'inline';
}

export function OfflineBanner({ variant = 'root' }: OfflineBannerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isOnline, netReady } = useOffline();
  const insets = useSafeAreaInsets();
  // Don't show anything until NetInfo has reported at least once - prevents
  // the "online → offline" flash on cold start when the device has no signal.
  if (!netReady) return null;
  if (isOnline) return null;

  const text = t('components.offlineBanner');

  if (variant === 'inline') {
    return (
      <View style={{ backgroundColor: theme.colors.warnSoft }}>
        <Text
          style={{
            color: theme.colors.warn,
            textAlign: 'center',
            paddingVertical: 5,
            paddingHorizontal: 12,
            fontSize: 12,
            fontWeight: '500',
          }}
        >
          {text}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.warnSoft,
        paddingTop: insets.top,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.warn,
      }}
    >
      <Text
        style={{
          color: theme.colors.warn,
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
