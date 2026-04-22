import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Screen } from '../components/ui';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { termsEn, termsKa, TERMS_PUBLIC_URL, TERMS_VERSION, type TermsBody } from '../lib/terms';
import { theme } from '../lib/theme';

export default function TermsScreen() {
  const { acceptTerms, signOut } = useSession();
  const router = useRouter();
  const toast = useToast();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const viewOnly = mode === 'view';

  const [lang, setLang] = useState<'ka' | 'en'>('ka');
  const [busy, setBusy] = useState(false);

  const body: TermsBody = lang === 'ka' ? termsKa : termsEn;

  const accept = async () => {
    setBusy(true);
    try {
      await acceptTerms(TERMS_VERSION);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      toast.error(e?.message ?? 'ქსელის შეცდომა');
    } finally {
      setBusy(false);
    }
  };

  const decline = () => {
    Alert.alert(
      lang === 'ka' ? 'დადასტურება' : 'Confirm',
      lang === 'ka'
        ? 'უარის თქმის შემთხვევაში აპლიკაციიდან გამოხვალ.'
        : 'Declining will sign you out.',
      [
        { text: lang === 'ka' ? 'გაუქმება' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'ka' ? 'გასვლა' : 'Sign out',
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ],
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: viewOnly, title: body.heading }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <View style={styles.langRow}>
            <Pressable
              style={[styles.langBtn, lang === 'ka' && styles.langBtnActive]}
              onPress={() => setLang('ka')}
            >
              <Text style={{ color: lang === 'ka' ? theme.colors.white : theme.colors.inkSoft, fontWeight: '700' }}>
                ქართული
              </Text>
            </Pressable>
            <Pressable
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => setLang('en')}
            >
              <Text style={{ color: lang === 'en' ? theme.colors.white : theme.colors.inkSoft, fontWeight: '700' }}>
                English
              </Text>
            </Pressable>
          </View>

          <Text style={{ fontSize: 24, fontWeight: '800', color: theme.colors.ink }}>
            {body.heading}
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>{body.updated}</Text>

          {body.sections.map(s => (
            <Card key={s.title} padding={14}>
              <Text style={{ fontWeight: '700', color: theme.colors.ink, marginBottom: 6 }}>{s.title}</Text>
              <Text style={{ color: theme.colors.ink, lineHeight: 20 }}>{s.body}</Text>
            </Card>
          ))}

          <Pressable onPress={() => Linking.openURL(TERMS_PUBLIC_URL)}>
            <Text style={{ color: theme.colors.accent, textAlign: 'center', marginTop: 6, fontWeight: '600' }}>
              {body.linkLabel} →
            </Text>
          </Pressable>

          {!viewOnly ? (
            <View style={{ gap: 10, marginTop: 12 }}>
              <Button title={body.agreeLabel} onPress={accept} loading={busy} />
              <Button title={body.declineLabel} variant="secondary" onPress={decline} disabled={busy} />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  langRow: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  langBtnActive: {
    backgroundColor: theme.colors.accent,
  },
});
