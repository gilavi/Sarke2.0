import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TriangleAlert } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button, Screen } from '../../components/ui';
import { useTheme } from '../../lib/theme';

export function NavigationRecovery({
  id,
  onRetry,
  body,
}: {
  id: string;
  onRetry: () => void;
  /** Body copy override — defaults to the load-timeout message. The wizard
   *  passes honest failed-load copy (offline cold cache vs generic error). */
  body?: string;
}) {
  void id;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <Screen edgeToEdge edges={['top']} style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <TriangleAlert size={48} color={theme.colors.semantic.warning} strokeWidth={1.5} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.ink, marginBottom: 8, textAlign: 'center' }}>
          {t('errors.loadFailed')}
        </Text>
        <Text style={{ fontSize: 14, color: theme.colors.inkSoft, marginBottom: 24, textAlign: 'center' }}>
          {body ?? t('inspections.loadTimeout')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant="secondary" onPress={() => router.back()} title={t('common.back')} />
          <Button variant="primary" onPress={onRetry} title={t('inspections.retryLoad')} />
        </View>
      </SafeAreaView>
    </Screen>
  );
}
