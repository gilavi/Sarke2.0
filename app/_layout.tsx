import '../lib/polyfills';
import '../lib/i18n';
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['AuthApiError: Invalid Refresh Token', 'Refresh Token Not Found']);
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Stack, useNavigationContainerRef, useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { BottomSheetProvider } from '../components/BottomSheet';
import { Skeleton } from '../components/Skeleton';
import { SessionProvider, useSession } from '../lib/session';
import { flushPendingSignatures } from '../lib/signatures';
import { flushPendingPdfUploads } from '../lib/pdfUploadQueue';
import { TERMS_VERSION } from '../lib/terms';
import { ToastProvider } from '../lib/toast';
import { OfflineProvider } from '../lib/offline';
import { OfflineBanner } from '../components/OfflineBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { logError } from '../lib/logError';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import { HeaderBackPill } from '../components/HeaderBackPill';
import { I18nextProvider } from 'react-i18next';
import i18n from '../lib/i18n';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { initCrashReporting } from '../lib/crashReporting';

initCrashReporting();

// Codes we've already tried to exchange. Prevents a double-exchange when both
// `getInitialURL()` (cold start) and the `url` listener (warm app) fire for the
// same recovery link — the second exchange would fail and replace the user's
// session with an error.
const exchangedCodes = new Set<string>();

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function AuthGate() {
  const { state } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const navRef = useNavigationContainerRef();
  const params = useGlobalSearchParams();
  const isTermsViewMode = params.mode === 'view';
  const { theme } = useTheme();

  // NOTE: removed __unsafe_action__ GO_BACK listener — it was intercepting
  // legitimate back navigations from modals (photo-picker → wizard) and
  // redirecting to home, breaking the photo flow.

  // Handle deep links:
  //   sarke://reset?code=...        — password-recovery PKCE exchange
  //   sarke://payment/success       — BOG payment success cold-start fallback
  //                                   (warm case is handled by WebBrowser.openAuthSessionAsync)
  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);

      // BOG payment success cold-start: user was kicked out of in-app browser
      // and the OS opened the app via the deep link instead.
      const isPaymentSuccess =
        parsed.hostname === 'payment' && parsed.path === 'success';
      if (isPaymentSuccess) {
        queryClient.invalidateQueries({ queryKey: ['pdf-usage'] });
        return;
      }

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
      } catch (e) {
        logError(e, '_layout.exchangeCodeForSession');
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
      } else if (!needsTerms && (inAuth || (inTerms && !isTermsViewMode))) {
        router.replace('/(tabs)/home');
      }
      // Opportunistic retry of any signature uploads that failed earlier.
      void flushPendingSignatures().catch((e) => logError(e, '_layout.flushPendingSignatures'));
      // Opportunistic retry of any deferred PDF uploads.
      void flushPendingPdfUploads().catch((e) => logError(e, '_layout.flushPendingPdfUploads'));
    }
  }, [state, segments, isTermsViewMode]);

  if (state.status === 'loading') {
    // Subtle full-screen skeleton instead of a spinner — hides the auth
    // boot latency. If the user is heading into a draft/detail screen, the
    // transition from this skeleton into the target screen's own skeleton
    // feels continuous.
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 20, paddingTop: 80, gap: 20 }}>
        <Skeleton width={140} height={13} />
        <Skeleton width={'75%'} height={30} />
        <View style={{ height: 12 }} />
        <Skeleton width={'100%'} height={72} radius={14} />
        <Skeleton width={100} height={10} style={{ marginTop: 20 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton width={'48%'} height={120} radius={16} />
          <Skeleton width={'48%'} height={120} radius={16} />
        </View>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        headerBackTitle: '',
        headerBackVisible: false,
        headerTintColor: theme.colors.accent,
        headerTitleStyle: {
          color: theme.colors.ink,
          fontWeight: '700',
          fontSize: 17,
        },
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerLeft: ({ canGoBack }) =>
          canGoBack !== false ? <HeaderBackPill /> : null,
      }}
    >
      <Stack.Screen
        name="photo-picker"
        options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'SpaceGrotesk-Bold': require('../assets/fonts/SpaceGrotesk.ttf'),
    'SpaceGrotesk-SemiBold': require('../assets/fonts/SpaceGrotesk.ttf'),
    'SpaceGrotesk-Medium': require('../assets/fonts/SpaceGrotesk.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter.ttf'),
    'JetBrainsMono-Regular': require('../assets/fonts/JetBrainsMono-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <ThemeProvider>
        <View style={{ flex: 1, backgroundColor: '#FAFAF8', paddingHorizontal: 20, paddingTop: 80, gap: 20 }}>
          <Skeleton width={140} height={13} />
          <Skeleton width={'75%'} height={30} />
          <View style={{ height: 12 }} />
          <Skeleton width={'100%'} height={72} radius={14} />
          <Skeleton width={100} height={10} style={{ marginTop: 20 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton width={'48%'} height={120} radius={16} />
            <Skeleton width={'48%'} height={120} radius={16} />
          </View>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <SafeAreaProvider>
              <ErrorBoundary>
                <ToastProvider>
                  <BottomSheetProvider>
                    <OfflineProvider>
                      <SessionProvider>
                        <ThemedStatusBar />
                        <OfflineBanner />
                        <ErrorBoundary>
                          <AuthGate />
                        </ErrorBoundary>
                      </SessionProvider>
                    </OfflineProvider>
                  </BottomSheetProvider>
                </ToastProvider>
              </ErrorBoundary>
              </SafeAreaProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </I18nextProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
