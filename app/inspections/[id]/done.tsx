// End-of-inspection fork screen.
//
// Reached right after the signing step finishes. At this point the
// inspection has already been flipped to `completed` (so the immutable
// record exists). The user picks whether to generate a PDF certificate
// now or defer — both paths are valid.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../../../components/ui';
import { theme } from '../../../lib/theme';

export default function InspectionDoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const generateCert = () => {
    if (!id) return;
    // `replace` (not push) — the user shouldn't be able to back into the fork
    // screen once they've moved on to the generator.
    router.replace(`/certificates/new?inspectionId=${id}` as any);
  };

  const saveOnly = () => {
    if (!id) return;
    router.replace(`/inspections/${id}` as any);
  };

  return (
    <Screen>
      {/* No header: this is a dead-end celebratory screen, forward nav only. */}
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={44} color={theme.colors.white} />
            </View>
            <Text style={styles.title}>ინსპექცია შენახულია</Text>
            <Text style={styles.subtitle}>
              მონაცემები დაფიქსირდა. შეგიძლია ახლავე დააგენერირო PDF
              სერტიფიკატი, ან დატოვო ინსპექცია როგორც ჩანაწერი და სერტიფიკატი
              მოგვიანებით დააგენერირო.
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            <Card padding={0}>
              <Pressable onPress={generateCert} style={styles.choice}>
                <View style={[styles.choiceIcon, { backgroundColor: theme.colors.accentSoft }]}>
                  <Ionicons name="document-text" size={22} color={theme.colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceTitle}>სერტიფიკატის გენერაცია</Text>
                  <Text style={styles.choiceBody}>
                    ახლავე დააგენერირე PDF, გააზიარე და დაურთე შენს ინსპექციას.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
              </Pressable>
            </Card>

            <Card padding={0}>
              <Pressable onPress={saveOnly} style={styles.choice}>
                <View style={[styles.choiceIcon, { backgroundColor: theme.colors.subtleSurface }]}>
                  <Ionicons name="save-outline" size={22} color={theme.colors.inkSoft} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceTitle}>ინსპექციის შენახვა</Text>
                  <Text style={styles.choiceBody}>
                    დატოვე ინსპექცია როგორც ჩანაწერი. სერტიფიკატი შეგიძლია
                    მოგვიანებით დააგენერირო.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
              </Pressable>
            </Card>
          </View>

          {/* Escape hatch to the full inspection list (unlikely path; here for
              completeness so the screen is never a navigational dead end). */}
          <Button
            title="ყველა ინსპექცია"
            variant="ghost"
            onPress={() => router.replace('/history' as any)}
            style={{ marginTop: 10 }}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 40, gap: 24 },
  header: { alignItems: 'center', gap: 12, marginBottom: 4 },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  choiceBody: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    marginTop: 4,
    lineHeight: 16,
  },
});
