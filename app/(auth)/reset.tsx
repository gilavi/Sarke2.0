import { useState, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CircleCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Keyboard } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { Button, Card, ErrorText } from '../../components/ui';
import { logError, toErrorMessage } from '../../lib/logError';
import { useTheme } from '../../lib/theme';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { useTranslation } from 'react-i18next';

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useSession();
  const [password, setPassword] = useState('');
  const confirmRef = useRef<TextInput>(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // Enabled save button + on-press field errors (see useSubmitGuard).
  const { attempted, guard } = useSubmitGuard();

  const canSubmit = password.length >= 6 && password === confirm;

  const submit = async () => {
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error(t('auth.sessionExpired'));
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      setError(toErrorMessage(e, t('errors.unknown')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[theme.colors.accentSoft, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardSafeArea
          headerHeight={0}
          contentStyle={{ paddingHorizontal: 22, paddingTop: 40, paddingBottom: 40 }}
        >
          <Text style={{ fontSize: 28, fontWeight: '900', color: theme.colors.ink }}>
            {t('auth.newPasswordTitle')}
          </Text>
          <Text style={{ color: theme.colors.inkSoft, marginTop: 6 }}>
            {t('auth.newPasswordHint')}
          </Text>

          <Card padding={22} style={{ marginTop: 22 }}>
            {done ? (
              <View style={{ gap: 12, alignItems: 'center' }}>
                <CircleCheck size={48} color={theme.colors.accent} strokeWidth={2} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>
                  {t('auth.passwordChanged')}
                </Text>
                <Button
                  title={t('auth.login')}
                  loading={signingOut}
                  disabled={signingOut}
                  onPress={async () => {
                    setSigningOut(true);
                    await signOut().catch((e) => logError(e, 'reset.signOut'));
                    router.replace('/(auth)/login');
                  }}
                />
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <FloatingLabelInput
                  label={t('auth.newPasswordLabel')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  error={attempted && password.length < 6 ? t('errors.passwordTooShort', { min: 6 }) : undefined}
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <FloatingLabelInput
                  ref={confirmRef}
                  label={t('auth.confirmPasswordLabel')}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="go"
                  error={attempted && password !== confirm ? t('auth.passwordMismatch') : undefined}
                  onSubmitEditing={() => guard(canSubmit, submit)}
                />
                {error ? <ErrorText>{error}</ErrorText> : null}
                <Button
                  title={t('common.save')}
                  onPress={() => guard(canSubmit, submit)}
                  loading={busy}
                />
              </View>
            )}
          </Card>
        </KeyboardSafeArea>
      </SafeAreaView>
    </View>
  );
}
