import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/ui';
import { theme } from '../lib/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <Stack.Screen options={{ title: 'გვერდი არ მოიძებნა', headerShown: true }} />
      <View style={styles.body}>
        <ErrorState
          icon="compass-outline"
          title="გვერდი არ მოიძებნა"
          message="ეს გვერდი არ არსებობს ან წაშლილია."
        />
        <View style={styles.action}>
          <Button
            title="მთავარ გვერდზე"
            variant="primary"
            size="lg"
            onPress={() => router.replace('/(tabs)/home')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  action: { paddingHorizontal: 24, marginTop: 8 },
});
