import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { Button, Card, ErrorText, Field, Input } from '../../components/ui';
import { theme } from '../../lib/theme';
import { toErrorMessage } from '../../lib/logError';
import { a11y } from '../../lib/accessibility';

export default function ForgotPasswordScreen() {
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
            <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 }} {...a11y('უკან დაბრუნება', 'გადავა წინა ეკრანზე', 'button')}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.inkSoft} />
              <Text style={{ color: theme.colors.inkSoft, fontWeight: '600' }}>უკან</Text>
            </Pressable>

            <Text style={{ fontSize: 28, fontWeight: '900', color: theme.colors.ink }}>
              პაროლის აღდგენა
            </Text>
            <Text style={{ color: theme.colors.inkSoft, marginTop: 6 }}>
              შეიყვანე იმეილი და გამოგიგზავნით ბმულს პაროლის შესაცვლელად.
            </Text>

            <Card padding={22} style={{ marginTop: 22 }}>
              {sent ? (
                <View style={{ gap: 12 }}>
                  <View style={{ alignItems: 'center', gap: 10 }}>
                    <Ionicons name="mail-outline" size={42} color={theme.colors.accent} />
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink, textAlign: 'center' }}>
                      ბმული გაიგზავნა
                    </Text>
                    <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
                      შეამოწმე {email.trim()} — შიგ არსებულ ბმულზე დაკლიკვით აპლიკაციაში დაბრუნდები ახალი პაროლის შესაყვანად.
                    </Text>
                  </View>
                  <Button title="შესვლა" onPress={() => router.replace('/(auth)/login')} {...a11y('შესვლა', 'გადავა შესვლის ეკრანზე', 'button')} />
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <Field label="იმეილი">
                    <Input
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </Field>
                  {error ? <ErrorText>{error}</ErrorText> : null}
                  <Button title="ბმულის გაგზავნა" onPress={submit} loading={busy} disabled={!email.trim()} {...a11y('ბმულის გაგზავნა', 'პაროლის აღსადგენი ბმულის გაგზავნა იმეილზე', 'button')} />
                </View>
              )}
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
