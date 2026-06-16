import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button, Screen } from '../../components/ui';
import { useTheme } from '../../lib/theme';

export function NavigationRecovery({
  id,
  onRetry,
}: {
  id: string;
  onRetry: () => void;
}) {
  void id;
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <Screen edgeToEdge edges={['top']} style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Ionicons name="warning-outline" size={48} color={theme.colors.semantic.warning} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.ink, marginBottom: 8, textAlign: 'center' }}>
          ჩატვირთვა ვერ მოხერხდა
        </Text>
        <Text style={{ fontSize: 14, color: theme.colors.inkSoft, marginBottom: 24, textAlign: 'center' }}>
          შემოწმების მონაცემების ჩატვირთვა ძალიან დიდხანს გრძელდება. სცადეთ თავიდან ან გადადით უკან.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant="secondary" onPress={() => router.back()} title="უკან" />
          <Button variant="primary" onPress={onRetry} title="თავიდან ცდა" />
        </View>
      </SafeAreaView>
    </Screen>
  );
}
