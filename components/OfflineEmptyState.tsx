// Offline empty state — rendered when useListLoadState() returns 'offline':
// the query is paused (no network) and nothing is cached, so neither a
// skeleton nor the regular "no items yet" empty state would be honest (the
// data may well exist server-side).

import { View, type ViewStyle } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';
import { useTheme } from '../lib/theme';

function OfflineIllustration() {
  const { theme } = useTheme();
  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      <WifiOff size={72} color={theme.colors.accent} strokeWidth={1.5} />
    </View>
  );
}

/**
 * Empty state for lists whose data was never downloaded and can't be fetched
 * right now. Pure presentation — pair with `useListLoadState`'s 'offline'
 * branch; never render it for the loading or confirmed-empty branches.
 */
export function OfflineEmptyState({ compact, style }: { compact?: boolean; style?: ViewStyle }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      illustration={OfflineIllustration}
      title={t('components.offlineEmptyTitle')}
      subtitle={t('components.offlineEmptyBody')}
      compact={compact}
      style={style}
    />
  );
}
