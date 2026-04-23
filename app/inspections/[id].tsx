// Inspection detail screen.
//
// Lands here when the user taps a completed inspection from history, the
// home recents list, or the inspection-end fork screen's "save inspection"
// CTA. Shows inspection metadata + its attached certificates, and offers
// a CTA to generate another certificate from the same inspection.
//
// Draft inspections still route through `/questionnaire/[id]` (wizard).
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../../components/ui';
import {
  certificatesApi,
  inspectionsApi,
  projectsApi,
  templatesApi,
} from '../../lib/services';
import { shareStoredPdf } from '../../lib/sharePdf';
import { useToast } from '../../lib/toast';
import { theme } from '../../lib/theme';
import type { Certificate, Inspection, Project, Template } from '../../types/models';

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await inspectionsApi.getById(id);
      if (!insp) {
        toast.error('ინსპექცია ვერ მოიძებნა');
        setLoading(false);
        return;
      }
      setInspection(insp);
      // If this is still a draft, bounce into the wizard — the detail view
      // only makes sense once the inspection is immutable.
      if (insp.status === 'draft') {
        router.replace(`/questionnaire/${insp.id}` as any);
        return;
      }
      const [tpl, proj, cs] = await Promise.all([
        templatesApi.getById(insp.template_id).catch(() => null),
        projectsApi.getById(insp.project_id).catch(() => null),
        certificatesApi.listByInspection(insp.id).catch(() => [] as Certificate[]),
      ]);
      setTemplate(tpl);
      setProject(proj);
      setCerts(cs);
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sharePdf = async (cert: Certificate) => {
    try { await shareStoredPdf(cert.pdf_url); }
    catch (e: any) { toast.error(e?.message ?? 'ვერ გაიხსნა'); }
  };

  const deleteCert = (cert: Certificate) => {
    Alert.alert(
      'სერტიფიკატის წაშლა?',
      'ეს წაშლის დაგენერირებულ PDF-ს. ინსპექცია უცვლელი დარჩება.',
      [
        { text: 'გაუქმება', style: 'cancel' },
        {
          text: 'წაშლა',
          style: 'destructive',
          onPress: async () => {
            try {
              await certificatesApi.remove(cert.id);
              setCerts(prev => prev.filter(c => c.id !== cert.id));
              toast.success('წაიშალა');
            } catch (e: any) {
              toast.error(e?.message ?? 'ვერ წაიშალა');
            }
          },
        },
      ],
    );
  };

  const generateNew = () => {
    if (!inspection) return;
    router.push(`/certificates/new?inspectionId=${inspection.id}` as any);
  };

  if (loading || !inspection) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'ინსპექცია' }} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'ინსპექცია' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          {/* Summary header */}
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 18 }}>
            <View style={styles.headerIcon}>
              <Ionicons
                name={inspection.is_safe_for_use === false ? 'warning' : 'checkmark-circle'}
                size={38}
                color={
                  inspection.is_safe_for_use === false
                    ? theme.colors.danger
                    : theme.colors.accent
                }
              />
            </View>
            <Text style={styles.templateName}>{template?.name ?? 'ინსპექცია'}</Text>
            {project ? (
              <Text style={styles.project}>{project.name}</Text>
            ) : null}
            <Text style={styles.date}>
              {new Date(inspection.completed_at ?? inspection.created_at).toLocaleString('ka')}
            </Text>
          </View>

          {/* Conclusion */}
          <Card>
            <Text style={styles.eyebrow}>დასკვნა</Text>
            <Text style={{ marginTop: 6, color: theme.colors.ink, lineHeight: 20 }}>
              {inspection.conclusion_text || '—'}
            </Text>
            <Text
              style={{
                marginTop: 10,
                fontWeight: '700',
                color:
                  inspection.is_safe_for_use === false
                    ? theme.colors.danger
                    : theme.colors.accent,
              }}
            >
              {inspection.is_safe_for_use === false
                ? '✗ არ არის უსაფრთხო ექსპლუატაციისთვის'
                : '✓ უსაფრთხოა ექსპლუატაციისთვის'}
            </Text>
          </Card>

          {/* Certificates list */}
          <View style={{ marginTop: 4 }}>
            <Text style={styles.sectionTitle}>სერტიფიკატები ({certs.length})</Text>
            {certs.length === 0 ? (
              <Card>
                <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>
                  ამ ინსპექციისთვის ჯერ არ არის დაგენერირებული სერტიფიკატი.
                </Text>
              </Card>
            ) : (
              <FlatList
                // Nested-scroll-free: wrapped in the parent ScrollView already.
                scrollEnabled={false}
                data={certs}
                keyExtractor={c => c.id}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                  <Pressable onPress={() => sharePdf(item)}>
                    <Card padding={12}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={styles.certDot}>
                          <Ionicons
                            name="document-text"
                            size={18}
                            color={theme.colors.accent}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.certTitle}>PDF</Text>
                          <Text style={styles.certMeta}>
                            {new Date(item.generated_at).toLocaleString('ka')}
                          </Text>
                        </View>
                        <Pressable
                          hitSlop={10}
                          onPress={() => deleteCert(item)}
                          style={{ padding: 6 }}
                          accessibilityLabel="delete certificate"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={theme.colors.danger}
                          />
                        </Pressable>
                        <Ionicons
                          name="share-outline"
                          size={18}
                          color={theme.colors.inkFaint}
                        />
                      </View>
                    </Card>
                  </Pressable>
                )}
              />
            )}
          </View>

          <Button
            title={certs.length === 0 ? 'სერტიფიკატის გენერაცია' : 'ახალი სერტიფიკატის გენერაცია'}
            onPress={generateNew}
            style={{ marginTop: 10 }}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.ink,
    textAlign: 'center',
  },
  project: { fontSize: 13, color: theme.colors.inkSoft },
  date: { fontSize: 12, color: theme.colors.inkFaint },
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  certDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certTitle: { fontWeight: '700', fontSize: 14, color: theme.colors.ink },
  certMeta: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
});
