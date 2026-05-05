import { useState, useMemo } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Screen } from '../components/ui';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import { termsEn, termsKa, TERMS_PUBLIC_URL, TERMS_VERSION, type TermsBody } from '../lib/terms';
import { useTheme } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

import { toErrorMessage } from '../lib/logError';
import { friendlyError } from '../lib/errorMap';
import { a11y } from '../lib/accessibility';

function TermsIllustration({ theme }: { theme: any }) {
  return (
    <View
      style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.regsSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
      }}
    >
      <Ionicons name="document-text-outline" size={36} color={theme.colors.regsTint} />
    </View>
  );
}

export default function TermsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
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
    } catch (e) {
      toast.error(friendlyError(e, 'ქსელის შეცდომა'));
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
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={{
            paddingTop: viewOnly ? 8 : 24,
            paddingBottom: 32,
          }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TermsIllustration theme={theme} />
            <Text style={styles.headerTitle}>{body.heading}</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.headerSubtitle}>{body.updated}</Text>
            </View>

            {/* Language toggle */}
            <View style={styles.langRow}>
              <Pressable
                style={[styles.langBtn, lang === 'ka' && styles.langBtnActive]}
                onPress={() => setLang('ka')}
                {...a11y('ქართული', 'ენის შეცვლა ქართულზე', 'button')}
              >
                <Text style={{ color: lang === 'ka' ? theme.colors.white : theme.colors.inkSoft, fontWeight: '700', fontSize: 13 }}>
                  ქართული
                </Text>
              </Pressable>
              <Pressable
                style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
                onPress={() => setLang('en')}
                {...a11y('English', 'ენის შეცვლა ინგლისურზე', 'button')}
              >
                <Text style={{ color: lang === 'en' ? theme.colors.white : theme.colors.inkSoft, fontWeight: '700', fontSize: 13 }}>
                  English
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Sections */}
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            {body.sections.map((s, index) => (
              <Card key={s.title} padding="none" style={{ overflow: 'hidden' }}>
                <View style={styles.cardAccent} />
                <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <View style={styles.numberBadge}>
                      <Text style={styles.numberText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{s.title.replace(/^\d+\.\s*/, '')}</Text>
                      <Text style={styles.cardDescription}>{s.body}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))}

            {/* Privacy Policy card */}
            <Card padding="none" style={{ overflow: 'hidden' }}>
              <View style={[styles.cardAccent, { backgroundColor: theme.colors.accent }]} />
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={[styles.numberBadge, { backgroundColor: theme.colors.accentSoft }]}>
                    <Ionicons name="shield-checkmark" size={14} color={theme.colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {lang === 'ka' ? 'კონფიდენციალურობის პოლიტიკა' : 'Privacy Policy'}
                    </Text>
                    <Text style={styles.cardDescription}>
                      {lang === 'ka'
                        ? 'Sarke 2.0 არ იზიარებს თქვენს პერსონალურ მონაცემებს მესამე მხარესთან. ფოტოები და ხელმოწერები ინახება მხოლოდ თქვენს პირად ანგარიშში. PDF ანგარიშები ხელმისაწვდომია მხოლოდ თქვენთვის და თქვენი ორგანიზაციისთვის. მონაცემთა წაშლა შესაძლებელია აპლიკაციის პარამეტრებიდან. ყველა მონაცემი დაცულია Supabase-ის უსაფრთხო სერვერებზე.'
                        : 'Sarke 2.0 does not share your personal data with third parties. Photos and signatures are stored only in your personal account. PDF reports are available only to you and your organization. Data deletion is available from app settings. All data is secured on Supabase servers.'}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Public link */}
            <Pressable onPress={() => Linking.openURL(TERMS_PUBLIC_URL)} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} {...a11y(body.linkLabel, 'გახსნის ვებ-ბრაუზერში', 'link')}>
              <Text style={{ color: theme.colors.accent, textAlign: 'center', marginTop: 6, fontWeight: '600', fontSize: 13 }}>
                {body.linkLabel} →
              </Text>
            </Pressable>

            {/* Copyright */}
            <Text style={{ fontSize: 11, color: theme.colors.inkFaint, textAlign: 'center', marginTop: 4 }}>
              © 2026 Sarke 2.0 · {lang === 'ka' ? 'ყველა უფლება დაცულია' : 'All rights reserved'}
            </Text>
          </View>

          {/* Action buttons */}
          {!viewOnly ? (
            <View style={{ paddingHorizontal: 24, gap: 10, marginTop: 20 }}>
              <Button title={body.agreeLabel} onPress={accept} loading={busy} {...a11y(body.agreeLabel, 'ვეთანხმები წესებსა და პირობებს', 'button')} />
              <Button title={body.declineLabel} variant="secondary" onPress={decline} disabled={busy} {...a11y(body.declineLabel, 'არ ვეთანხმები წესებსა და პირობებს', 'button')} />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
    header: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.ink,
      marginTop: 4,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    headerSubtitle: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      lineHeight: 18,
    },
    langRow: {
      flexDirection: 'row',
      padding: 4,
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 999,
      marginTop: 16,
    },
    langBtn: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 999,
    },
    langBtnActive: {
      backgroundColor: theme.colors.accent,
    },
    cardAccent: {
      height: 3,
      backgroundColor: theme.colors.regsTint,
      opacity: 0.8,
    },
    numberBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.regsSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    numberText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.regsTint,
    },
    cardTitle: {
      fontWeight: '600',
      fontSize: 15,
      color: theme.colors.ink,
      lineHeight: 20,
    },
    cardDescription: {
      color: theme.colors.inkSoft,
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
