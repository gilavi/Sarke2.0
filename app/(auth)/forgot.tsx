import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { Button, Card, ErrorText } from '../../components/ui';
import { HeaderBackPill } from '../../components/HeaderBackPill';
import { useTheme } from '../../lib/theme';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { toErrorMessage } from '../../lib/logError';
import { a11y } from '../../lib/accessibility';
import { useTranslation } from 'react-i18next';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const redirectTo = Linking.createURL('/reset');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setSent(true);
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
          headerOffset={0}
          contentStyle={{ paddingHorizontal: 22, paddingTop: 40, paddingBottom: 40 }}
        >
          <View style={{ marginBottom: 18 }}>
            <HeaderBackPill label={t('auth.login')} />
          </View>

          <Text style={{ fontSize: 28, fontWeight: '900', color: theme.colors.ink }}>
            {t('auth.resetTitle')}
          </Text>
          <Text style={{ color: theme.colors.inkSoft, marginTop: 6 }}>
            {t('auth.resetSubtitle')}
          </Text>

          <Card padding={22} style={{ marginTop: 22 }}>
            {sent ? (
              <View style={{ gap: 12 }}>
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <Ionicons name="mail-outline" size={42} color={theme.colors.accent} />
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink, textAlign: 'center' }}>
                    {t('auth.linkSent')}
                  </Text>
                  <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
                    {t('auth.linkSentBody', { email: email.trim() })}
                  </Text>
                </View>
                <Button title={t('auth.login')} onPress={() => router.replace('/(auth)/login')} />
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <FloatingLabelInput
                  label={t('common.email')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {error ? <ErrorText>{error}</ErrorText> : null}
                <Button title={t('auth.sendLink')} onPress={submit} loading={busy} disabled={!email.trim()} />
              </View>
            )}
          </Card>
        </KeyboardSafeArea>
      </SafeAreaView>
    </View>
  );
}
