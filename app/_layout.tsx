import '../lib/polyfills';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { SessionProvider, useSession } from '../lib/session';
import { flushPendingSignatures } from '../lib/signatures';
import { TERMS_VERSION } from '../lib/terms';
import { ToastProvider } from '../lib/toast';
import { OfflineProvider } from '../lib/offline';
import { OfflineBanner } from '../components/OfflineBanner';
import { theme } from '../lib/theme';

// Codes we've already tried to exchange. Prevents a double-exchange when both
// `getInitialURL()` (cold start) and the `url` listener (warm app) fire for the
// same recovery link — the second exchange would fail and replace the user's
// session with an error.
const exchangedCodes = new Set<string>();

function AuthGate() {
  const { state } = useSession();
  const segments = useSegments();
  const router = useRouter();

  // Handle Supabase password-recovery deep links (sarke://reset?code=...).
  // Exchange the PKCE code for a session, then route to the reset form.
  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const code = (parsed.queryParams?.code as string | undefined) ?? undefined;
      const isReset = parsed.path === 'reset' || parsed.hostname === 'reset';
      if (!isReset || !code) return;
      if (exchangedCodes.has(code)) {
        // Already handled this code in this session — just route.
        router.replace('/(auth)/reset');
        return;
      }
      exchangedCodes.add(code);
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        router.replace('/(auth)/reset');
      } catch {
        router.replace('/(auth)/forgot');
      }
    };
    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => void handle(e.url));
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (state.status === 'loading') return;
    const inAuth = segments[0] === '(auth)';
    const inTerms = segments[0] === 'terms';
    const inReset = inAuth && (segments as string[])[1] === 'reset';
    if (inReset) return; // let the reset flow run regardless of session state
    if (state.status === 'signedOut' && !inAuth) {
      router.replace('/(auth)/login');
    } else if (state.status === 'signedIn') {
      const needsTerms =
        !state.user?.tc_accepted_version || state.user.tc_accepted_version !== TERMS_VERSION;
      if (needsTerms && !inTerms) {
        router.replace('/terms');
      } else if (!needsTerms && (inAuth || inTerms)) {
        router.replace('/(tabs)/home');
      }
      // Opportunistic retry of any signature uploads that failed earlier.
      void flushPendingSignatures().catch(() => {});
    }
  }, [state, segments]);

  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        // Consistent header styling for every pushed screen. Individual screens
        // set `headerShown: true` + their own title; these defaults cover the
        // rest (back-button label, typography, tint, no shadow) so we never
        // leak group names like "(tabs)" into the back button and every
        // header looks the same.
        headerBackTitle: 'უკან',
        headerTintColor: theme.colors.accent,
        headerTitleStyle: {
          color: theme.colors.ink,
          fontWeight: '700',
          fontSize: 17,
        },
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ActionSheetProvider>
          <ToastProvider>
            <OfflineProvider>
              <SessionProvider>
                <StatusBar style="dark" />
                <OfflineBanner />
                <AuthGate />
              </SessionProvider>
            </OfflineProvider>
          </ToastProvider>
        </ActionSheetProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
