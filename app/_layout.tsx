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
import { ErrorBoundary } from '../components/ErrorBoundary';
import { logError } from '../lib/logError';
import { isOscillating, recordRedirect } from '../lib/navigationGuard';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import { HeaderBackButton } from '../components/HeaderBackButton';
import { I18nextProvider } from 'react-i18next';
import i18n from '../lib/i18n';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { initCrashReporting } from '../lib/crashReporting';
import { migrateLegacyStorage } from '../lib/storageMigration';
import { UiStringsLoader } from '../components/UiStringsLoader';

initCrashReporting();
// Rebrand: carry legacy `sarke.*` storage keys over to `hubble.*` once on boot
// (preserves Google Calendar tokens + scheduled-reminder map). Fire-and-forget.
void migrateLegacyStorage();

// Codes we've already tried to exchange. Prevents a double-exchange when both
// `getInitialURL()` (cold start) and the `url` listener (warm app) fire for the
// same recovery link - the second exchange would fail and replace the user's
// session with an error.
const exchangedCodes = new Set<string>();
// Deep-link codes are single-use; cap the set so it can't grow unbounded
// across a long-lived session.
function rememberCode(code: string) {
  if (exchangedCodes.size > 50) exchangedCodes.clear();
  exchangedCodes.add(code);
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function FontsLoadingFallback() {
  const { theme } = useTheme();
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

function AuthGate() {
  const { state } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const navRef = useNavigationContainerRef();
  const params = useGlobalSearchParams();
  const isTermsViewMode = params.mode === 'view';
  const { theme } = useTheme();

  // NOTE: removed __unsafe_action__ GO_BACK listener - it was intercepting
  // legitimate back navigations from modals (photo-picker → wizard) and
  // redirecting to home, breaking the photo flow.

  // Handle deep links:
  //   sarke2://reset?code=...        - password-recovery PKCE exchange
  //   sarke2://verify-email?code=... - email-verification PKCE exchange
  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);

      const code = (parsed.queryParams?.code as string | undefined) ?? undefined;

      const isVerifyEmail = parsed.path === 'verify-email' || parsed.hostname === 'verify-email';
      if (isVerifyEmail && code) {
        if (exchangedCodes.has(code)) return;
        rememberCode(code);
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          // Session is now active; AuthGate will redirect to home/terms.
        } catch (e) {
          logError(e, '_layout.exchangeCodeForSession.verifyEmail');
          router.replace('/(auth)/login');
        }
        return;
      }

      const isReset = parsed.path === 'reset' || parsed.hostname === 'reset';
      if (!isReset || !code) return;
      if (exchangedCodes.has(code)) {
        // Already handled this code in this session - just route.
        router.replace('/(auth)/reset');
        return;
      }
      rememberCode(code);
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
    const currentPath = segments.join('/');
    if (state.status === 'signedOut' && !inAuth) {
      const target = '/(auth)/login';
      if (!isOscillating(currentPath, target)) {
        recordRedirect(currentPath, target);
        router.replace(target);
      }
    } else if (state.status === 'signedIn') {
      // Only redirect to terms when the user profile is loaded. If user is null
      // (profile fetch failed or still in-flight), leave navigation alone.
      const needsTerms =
        !!state.user &&
        (!state.user.tc_accepted_version || state.user.tc_accepted_version !== TERMS_VERSION);
      if (needsTerms && !inTerms) {
        const target = '/terms';
        if (!isOscillating(currentPath, target)) {
          recordRedirect(currentPath, target);
          router.replace(target);
        }
      } else if (!needsTerms && (inAuth || (inTerms && !isTermsViewMode))) {
        const target = '/(tabs)/home';
        if (!isOscillating(currentPath, target)) {
          recordRedirect(currentPath, target);
          router.replace(target);
        }
      }
    }
  }, [state, segments, isTermsViewMode]);

  // Opportunistic retry of signature uploads / deferred PDF uploads that
  // failed earlier. Once per transition to signed-in — NOT per navigation
  // (`state`/`segments` change on every route push, and each flush is at
  // minimum an AsyncStorage queue read). Reconnect-time retries are owned by
  // OfflineProvider's flushAllQueues (lib/offline.tsx).
  const signedIn = state.status === 'signedIn';
  useEffect(() => {
    if (!signedIn) return;
    void flushPendingSignatures().catch((e) => logError(e, '_layout.flushPendingSignatures'));
    void flushPendingPdfUploads().catch((e) => logError(e, '_layout.flushPendingPdfUploads'));
  }, [signedIn]);

  if (state.status === 'loading') {
    // Subtle full-screen skeleton instead of a spinner - hides the auth
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
          canGoBack !== false ? <HeaderBackButton /> : null,
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
  // One registration per physical font file. The weight-suffixed aliases
  // (Inter-Medium/SemiBold/Bold, SpaceGrotesk-*) used to register the same
  // TTFs under 8 names — 8 native font loads for 3 files — and no style ever
  // referenced them (an alias can't render a true weight anyway: all names
  // pointed at the same glyph outlines). Only these two are consumed:
  // Inter-Regular (FloatingLabelInput) + JetBrainsMono-Regular (theme mono).
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter.ttf'),
    'JetBrainsMono-Regular': require('../assets/fonts/JetBrainsMono-Regular.ttf'),
  });

  // The provider tree mounts immediately; only the navigator subtree gates on
  // fonts. That lets session bootstrap (SessionProvider getSession +
  // SecureStore reads) and the React Query cache rehydration run in PARALLEL
  // with font I/O instead of behind it. The fallback skeleton renders no
  // custom-font text, and visually matches AuthGate's own loading skeleton.
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <UiStringsLoader />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <SafeAreaProvider>
              <ErrorBoundary>
                <ToastProvider>
                  <BottomSheetProvider>
                    <OfflineProvider>
                      <SessionProvider>
                        <ThemedStatusBar />
                        <ErrorBoundary>
                          {fontsLoaded ? <AuthGate /> : <FontsLoadingFallback />}
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
