import '../lib/polyfills';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { SessionProvider, useSession } from '../lib/session';
import { ToastProvider } from '../lib/toast';
import { theme } from '../lib/theme';

function AuthGate() {
  const { state } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'loading') return;
    const inAuth = segments[0] === '(auth)';
    if (state.status === 'signedOut' && !inAuth) {
      router.replace('/(auth)/login');
    } else if (state.status === 'signedIn' && inAuth) {
      router.replace('/(tabs)/home');
    }
  }, [state.status, segments]);

  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ActionSheetProvider>
          <ToastProvider>
            <SessionProvider>
              <StatusBar style="dark" />
              <AuthGate />
            </SessionProvider>
          </ToastProvider>
        </ActionSheetProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
