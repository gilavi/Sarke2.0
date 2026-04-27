import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { Button, Card, ErrorText, Field, Input } from '../../components/ui';
import { logError, toErrorMessage } from '../../lib/logError';
import { theme } from '../../lib/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { signOut } = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = password.length >= 6 && password === confirm;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('აღდგენის სესია ვადაგასულია. გთხოვთ, ხელახლა მოითხოვოთ ბმული.');
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      setError(toErrorMessage(e, 'უცნობი შეცდომა'));
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 40, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ fontSize: 28, fontWeight: '900', color: theme.colors.ink }}>
              ახალი პაროლი
            </Text>
            <Text style={{ color: theme.colors.inkSoft, marginTop: 6 }}>
              შეიყვანეთ ახალი პაროლი (მინ. 6 სიმბოლო).
            </Text>

            <Card padding={22} style={{ marginTop: 22 }}>
              {done ? (
                <View style={{ gap: 12, alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={48} color={theme.colors.accent} />
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>
                    პაროლი შეცვლილია
                  </Text>
                  <Button
                    title="შესვლა"
                    onPress={async () => {
                      // End the temporary recovery session so the user signs
                      // in fresh with the new password (no stale half-state).
                      await signOut().catch((e) => logError(e, 'reset.signOut'));
                      router.replace('/(auth)/login');
                    }}
                  />
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <Field label="ახალი პაროლი">
                    <Input
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      placeholder="••••••••"
                    />
                  </Field>
                  <Field label="გაიმეორეთ პაროლი">
                    <Input
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry
                      placeholder="••••••••"
                    />
                  </Field>
                  {error ? <ErrorText>{error}</ErrorText> : null}
                  <Button
                    title="შენახვა"
                    onPress={submit}
                    loading={busy}
                    disabled={!canSubmit}
                  />
                </View>
              )}
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
