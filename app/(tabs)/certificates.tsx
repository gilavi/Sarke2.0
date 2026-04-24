// Certificates tab — list of generated PDF certificates.
//
// Each row is a `certificates` table entry (a PDF derived from a completed
// inspection). Tap → share the PDF. Tap the link icon → open the parent
// inspection detail screen. Swipe delete removes the certificate row but
// leaves the underlying inspection intact.
//
// The expert's own qualifications (xaracho_inspector etc.) now live at
// `/qualifications` (reached from the More tab).
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Card } from '../../components/ui';
import {
  certificatesApi,
  inspectionsApi,
  projectsApi,
  templatesApi,
} from '../../lib/services';
import { shareStoredPdf } from '../../lib/sharePdf';
import { useToast } from '../../lib/toast';
import { theme } from '../../lib/theme';
import type {
  Certificate,
  Inspection,
  Project,
  Template,
} from '../../types/models';

export default function CertificatesScreen() {
  const router = useRouter();
  const toast = useToast();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const load = useCallback(async () => {
    // Load certificates plus enough surrounding metadata to render each row
    // with its template+project context. Batched so the list is rendered in
    // a single paint.
    const [cs, ts, ps, insps] = await Promise.all([
      certificatesApi.list().catch(() => []),
      templatesApi.list().catch(() => []),
      projectsApi.list().catch(() => []),
      inspectionsApi.recent(500).catch(() => []),
    ]);
    setCerts(cs);
    setTemplates(ts);
    setProjects(ps);
    setInspections(insps);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // O(1) lookups — rendering 100+ rows otherwise becomes quadratic on the
  // find() calls.
  const inspectionById = useMemo(
    () => new Map(inspections.map(i => [i.id, i])),
    [inspections],
  );
  const templateById = useMemo(
    () => new Map(templates.map(t => [t.id, t])),
    [templates],
  );
  const projectById = useMemo(
    () => new Map(projects.map(p => [p.id, p])),
    [projects],
  );

  const sharePdf = async (cert: Certificate) => {
    try { await shareStoredPdf(cert.pdf_url); }
    catch (e: any) { toast.error(e?.message ?? 'ვერ გაიხსნა'); }
  };

  const openInspection = (cert: Certificate) => {
    router.push(`/inspections/${cert.inspection_id}` as any);
  };

  const deleteCert = (cert: Certificate) => {
    Alert.alert(
      'PDF რეპორტის წაშლა?',
      'PDF წაიშლება. ინსპექცია უცვლელი დარჩება.',
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>PDF რეპორტები</Text>
      </View>
      <FlatList
        data={certs}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text" size={46} color={theme.colors.accent} style={{ opacity: 0.6 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>
              ცარიელია
            </Text>
            <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
              დაასრულე ინსპექცია და დააგენერირე პირველი PDF რეპორტი.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const insp = inspectionById.get(item.inspection_id) ?? null;
          const tpl = templateById.get(item.template_id) ?? null;
          const proj = insp ? (projectById.get(insp.project_id) ?? null) : null;
          return (
            <Swipeable
              renderRightActions={() => (
                <Pressable onPress={() => deleteCert(item)} style={styles.swipeDelete}>
                  <Ionicons name="trash" size={18} color={theme.colors.white} />
                  <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 11 }}>
                    წაშლა
                  </Text>
                </Pressable>
              )}
              overshootRight={false}
            >
              <Pressable onPress={() => sharePdf(item)}>
                <Card padding={12}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.dot}>
                      <Ionicons name="document-text" size={18} color={theme.colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {tpl?.name ?? 'PDF რეპორტი'}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {proj?.name ?? '—'}
                      </Text>
                      <Text style={styles.rowDate}>
                        {new Date(item.generated_at).toLocaleString('ka')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => openInspection(item)}
                      hitSlop={10}
                      style={{ padding: 6 }}
                      accessibilityLabel="open parent inspection"
                    >
                      <Ionicons
                        name="open-outline"
                        size={18}
                        color={theme.colors.inkSoft}
                      />
                    </Pressable>
                    <Ionicons name="share-outline" size={18} color={theme.colors.inkFaint} />
                  </View>
                </Card>
              </Pressable>
            </Swipeable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.ink },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.ink },
  rowMeta: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 1 },
  rowDate: { fontSize: 11, color: theme.colors.inkFaint, marginTop: 2 },
  swipeDelete: {
    width: 86,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: 8,
    borderRadius: 12,
  },
});
