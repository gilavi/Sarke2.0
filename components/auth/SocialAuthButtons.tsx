import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { friendlyError, isCancelledError } from '../../lib/errorMap';

interface Props {
  /** Picks the Apple button type (SIGN_IN vs SIGN_UP) and the Google label. */
  mode: 'login' | 'register';
  /** Receives a user-facing message on failure, null to clear. */
  onError: (message: string | null) => void;
}

/**
 * Third-party sign-in block for the auth screen.
 *
 * iOS renders ONLY the native Sign in with Apple button (Apple guideline 4.8:
 * offering Google without Apple is a rejection; `googleIosClientId` is empty
 * anyway, so Google was dead on iOS). Android keeps Google sign-in unchanged.
 * Calls `signInWithApple` / `signInWithGoogle` from `lib/session.tsx`;
 * cancellations are swallowed, real failures surface through `onError`.
 */
export function SocialAuthButtons({ mode, onError }: Props) {
  const { theme, isDark } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const { signInWithGoogle, signInWithApple } = useSession();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const run = async (kind: 'google' | 'apple', fn: () => Promise<void>) => {
    setBusy(kind);
    onError(null);
    try {
      await fn();
    } catch (e) {
      if (!isCancelledError(e)) onError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  if (Platform.OS === 'ios') {
    // No Google on iOS. If Apple auth is unavailable (old iOS, Expo Go quirk),
    // render nothing - email/password auth above remains fully usable.
    if (!appleAvailable) return null;
    return (
      <View pointerEvents={busy ? 'none' : 'auto'} style={busy ? s.busyDim : null}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            mode === 'register'
              ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={
            isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={14}
          style={s.appleBtn}
          onPress={() => run('apple', signInWithApple)}
        />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => run('google', signInWithGoogle)}
      disabled={busy !== null}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.googleBtn,
        pressed && { opacity: 0.82 },
        busy === 'google' && { opacity: 0.6 },
      ]}
    >
      {busy === 'google' ? (
        <ActivityIndicator color={theme.colors.inkSoft} />
      ) : (
        <>
          <View style={s.googleLogoWrap}>
            <Text style={s.googleLogoText}>G</Text>
          </View>
          <Text style={s.googleLabel}>
            {mode === 'register' ? t('auth.registerWithGoogle') : t('auth.loginWithGoogle')}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    // Apple's HIG floor is 44pt; 48 matches the app's primary buttons.
    appleBtn: {
      height: 48,
      width: '100%',
    },
    busyDim: {
      opacity: 0.6,
    },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    googleLogoWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#4285F4',
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleLogoText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '900',
    },
    googleLabel: {
      fontWeight: '600',
      fontSize: 15,
      color: theme.colors.ink,
    },
  });
