// Certificate detail / preview screen.
//
// Reached by tapping any cert row in the tab list or inspection detail.
// Shows cert metadata + an in-app WebView rendering the actual PDF
// (using the local file:// URI stored in cert.params.localUri at
// generation time). Falls back to a "preview unavailable" state for seeded
// mock certs that were never actually printed.
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { Screen } from '../../components/ui';
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

type CertParams = {
  expertName?: string | null;
  qualTypes?: { type: string; number: string | null }[];
  signerNames?: string[];
  localUri?: string;
};

export default function CertificateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [cert, setCert] = useState<Certificate | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await certificatesApi.getById(id).catch(() => null);
      if (!c) {
        toast.error('PDF ვერ მოიძებნა');
        router.back();
        return;
      }
      setCert(c);
      const insp = await inspectionsApi.getById(c.inspection_id).catch(() => null);
      setInspection(insp);
      if (!insp) return;
      const [tpl, proj] = await Promise.all([
        templatesApi.getById(insp.template_id).catch(() => null),
        projectsApi.getById(insp.project_id).catch(() => null),
      ]);
      setTemplate(tpl);
      setProject(proj);
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const share = async () => {
    if (!cert) return;
    setSharing(true);
    try {
      const params = cert.params as CertParams;
      if (params?.localUri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(params.localUri, { mimeType: 'application/pdf' });
      } else {
        await shareStoredPdf(cert.pdf_url);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'ვერ გაიზიარა');
    } finally {
      setSharing(false);
    }
  };

  if (loading || !cert) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'PDF რეპორტი' }} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.accent} />
        </SafeAreaView>
      </Screen>
    );
  }

  const params = cert.params as CertParams;
  const localUri = params?.localUri;
  const isSafe = cert.is_safe_for_use;
  const safeColor = isSafe === false ? theme.colors.danger : theme.colors.accent;
  const safeBg = isSafe === false ? theme.colors.dangerSoft : theme.colors.accentSoft;
  const expertName = params?.expertName;
  const qualTypes = params?.qualTypes ?? [];
  const signerNames = params?.signerNames ?? [];

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'PDF რეპორტი',
          headerRight: () => (
            <Pressable
              onPress={share}
              disabled={sharing}
              style={{ paddingHorizontal: 4 }}
              hitSlop={10}
            >
              {sharing
                ? <ActivityIndicator size="small" color={theme.colors.accent} />
                : <Ionicons name="share-outline" size={22} color={theme.colors.accent} />
              }
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        {/* ── Metadata strip ─────────────────────────────────────────── */}
        <View style={styles.metaStrip}>
          {/* Safety badge */}
          <View style={[styles.safeBadge, { backgroundColor: safeBg }]}>
            <Ionicons
              name={isSafe === false ? 'warning' : 'checkmark-circle'}
              size={13}
              color={safeColor}
            />
            <Text style={[styles.safeBadgeText, { color: safeColor }]}>
              {isSafe === false ? 'არ არის უსაფრთხო' : 'უსაფრთხოა'}
            </Text>
          </View>

          {/* Template + project */}
          <View style={{ flex: 1 }}>
            <Text style={styles.templateName} numberOfLines={1}>
              {template?.name ?? 'PDF რეპორტი'}
            </Text>
            {project ? <Text style={styles.metaSub}>{project.name}</Text> : null}
            <Text style={styles.metaDate}>
              {new Date(cert.generated_at).toLocaleString('ka')}
            </Text>
          </View>
        </View>

        {/* ── People / qual chips ─────────────────────────────────────── */}
        {(expertName || qualTypes.length > 0 || signerNames.length > 0) ? (
          <View style={styles.chipsRow}>
            {expertName ? (
              <View style={styles.chip}>
                <Ionicons name="person-outline" size={11} color={theme.colors.inkSoft} />
                <Text style={styles.chipText}>{expertName}</Text>
              </View>
            ) : null}
            {qualTypes.map(q => (
              <View key={q.type} style={styles.chip}>
                <Ionicons name="ribbon-outline" size={11} color={theme.colors.inkSoft} />
                <Text style={styles.chipText}>{q.number ? `№${q.number}` : q.type}</Text>
              </View>
            ))}
            {signerNames.map(n => (
              <View key={n} style={styles.chip}>
                <Ionicons name="create-outline" size={11} color={theme.colors.inkSoft} />
                <Text style={styles.chipText}>{n}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── PDF preview ─────────────────────────────────────────────── */}
        <View style={{ flex: 1, backgroundColor: theme.colors.subtleSurface }}>
          {localUri ? (
            <>
              {webviewLoading ? (
                <View style={styles.webviewLoader}>
                  <ActivityIndicator color={theme.colors.accent} />
                  <Text style={{ marginTop: 8, color: theme.colors.inkSoft, fontSize: 13 }}>
                    PDF იტვირთება…
                  </Text>
                </View>
              ) : null}
              <WebView
                source={{ uri: localUri }}
                style={[styles.webview, webviewLoading && { opacity: 0 }]}
                onLoadEnd={() => setWebviewLoading(false)}
                onError={() => {
                  setWebviewLoading(false);
                  toast.error('PDF ვერ გაიხსნა');
                }}
              />
            </>
          ) : (
            <View style={styles.noPreview}>
              <Ionicons name="document-text-outline" size={48} color={theme.colors.inkFaint} />
              <Text style={styles.noPreviewText}>PDF preview unavailable</Text>
              <Text style={styles.noPreviewSub}>
                ეს PDF სერვერიდან სიმულაციის გარეშე ხელმისაწვდომია. გაზიარებისთვის დააჭირე Share.
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaStrip: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 6,
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  safeBadgeText: { fontSize: 12, fontWeight: '700' },
  templateName: { fontSize: 15, fontWeight: '700', color: theme.colors.ink, marginTop: 4 },
  metaSub: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 1 },
  metaDate: { fontSize: 11, color: theme.colors.inkFaint, marginTop: 1 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.subtleSurface,
  },
  chipText: { fontSize: 11, color: theme.colors.inkSoft },
  webview: {
    flex: 1,
    backgroundColor: theme.colors.subtleSurface,
  },
  webviewLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.subtleSurface,
    zIndex: 1,
  },
  noPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  noPreviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  noPreviewSub: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    lineHeight: 18,
  },
});
