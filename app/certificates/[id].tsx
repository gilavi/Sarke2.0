// Certificate detail / preview screen.
//
// Reached by tapping any cert row in the tab list or inspection detail.
// Shows cert metadata + an in-app WebView rendering the actual PDF
// (using the local file:// URI stored in cert.params.localUri at
// generation time). Falls back to a "preview unavailable" state for seeded
// mock certs that were never actually printed.
import { useCallback, useEffect, useState , useMemo} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { Screen } from '../../components/ui';
import { Skeleton, SkeletonPreview } from '../../components/Skeleton';
import {
  certificatesApi,
  inspectionsApi,
  projectsApi,
  storageApi,
  templatesApi,
} from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { shareStoredPdf } from '../../lib/sharePdf';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';

import { logError, toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { a11y } from '../../lib/accessibility';
import type { Certificate, CertificateParams, Project, Template } from '../../types/models';
import { useTranslation } from 'react-i18next';

export default function CertificateDetailScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [cert, setCert] = useState<Certificate | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  // Resolved PDF URI to feed the WebView — prefer the device-local file://
  // (fast, works offline); on miss or WebView error, download from storage.
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await certificatesApi.getById(id).catch((e) => { logError(e, 'certDetail.cert'); return null; });
      if (!c) {
        toast.error(t('errors.notFound'));
        router.back();
        return;
      }
      setCert(c);
      const insp = await inspectionsApi.getById(c.inspection_id).catch((e) => { logError(e, 'certDetail.inspection'); return null; });
      if (!insp) return;
      const [tpl, proj] = await Promise.all([
        templatesApi.getById(insp.template_id).catch((e) => { logError(e, 'certDetail.template'); return null; }),
        projectsApi.getById(insp.project_id).catch((e) => { logError(e, 'certDetail.project'); return null; }),
      ]);
      setTemplate(tpl);
      setProject(proj);
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Resolve PDF source: try local file:// first, then fall back to
  // downloading cert.pdf_url from storage into the app cache.
  useEffect(() => {
    if (!cert) return;
    let cancelled = false;
    setResolveError(false);
    setWebviewLoading(true);
    (async () => {
      try {
        if (!cert.pdf_url) throw new Error('no pdf_url');
        const name = cert.pdf_url.split('/').pop() ?? `${cert.id}.pdf`;
        const cacheBase = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
        if (!cacheBase) throw new Error('no cache dir');
        const target = `${cacheBase}cert-preview-${cert.id}-${name}`;
        const signed = await storageApi.signedUrl(STORAGE_BUCKETS.pdfs, cert.pdf_url, 3600)
          .catch((e) => { logError(e, 'certDetail.signedUrl'); return storageApi.publicUrl(STORAGE_BUCKETS.pdfs, cert.pdf_url); });
        const res = await FileSystem.downloadAsync(signed, target);
        if (res.status !== 200) throw new Error(`download ${res.status}`);
        if (!cancelled) setResolvedUri(target);
      } catch (e) {
        logError(e, 'certDetail.resolveUri');
        if (!cancelled) { setResolvedUri(null); setResolveError(true); setWebviewLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [cert]);

  const share = async () => {
    if (!cert) return;
    setSharing(true);
    try {
      if (resolvedUri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(resolvedUri, { mimeType: 'application/pdf' });
      } else {
        await shareStoredPdf(cert.pdf_url);
      }
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSharing(false);
    }
  };

  if (loading || !cert) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: t('certificates.pdfReport'), headerBackTitle: t('certificates.title') }} />
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          {/* Meta strip skeleton mirrors the real header layout */}
          <View style={styles.metaStrip}>
            <Skeleton width={110} height={22} radius={999} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={'70%'} height={14} />
              <Skeleton width={'40%'} height={11} />
              <Skeleton width={'50%'} height={10} />
            </View>
          </View>
          <View style={styles.chipsRow}>
            <Skeleton width={100} height={20} radius={999} />
            <Skeleton width={80} height={20} radius={999} />
            <Skeleton width={60} height={20} radius={999} />
          </View>
          <View style={{ flex: 1, backgroundColor: theme.colors.subtleSurface }}>
            <SkeletonPreview />
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  const params: CertificateParams = cert.params ?? {};
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
          title: t('certificates.pdfReport'),
          headerBackTitle: t('certificates.title'),
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
            <Text style={[styles.safeBadgeText, { color: safeColor }]} numberOfLines={1}>
              {isSafe === false ? t('inspections.notSafe') : t('inspections.safe')}
            </Text>
          </View>

          {/* Template + project */}
          <View style={{ flex: 1 }}>
            <Text style={styles.templateName} numberOfLines={1}>
              {template?.name ?? t('certificates.pdfReport')}
            </Text>
            {project ? <Text style={styles.metaSub}>{project.name}</Text> : null}
            <Text style={styles.metaDate}>
              {new Date(cert.generated_at).toLocaleString(t('common.localeTag'))}
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
          {resolvedUri ? (
            <>
              {webviewLoading ? (
                <View style={StyleSheet.absoluteFillObject}>
                  <SkeletonPreview />
                </View>
              ) : null}
              <WebView
                source={{ uri: resolvedUri }}
                style={[styles.webview, webviewLoading && { opacity: 0 }]}
                onLoadEnd={() => setWebviewLoading(false)}
                onError={() => {
                  setWebviewLoading(false);
                  setResolveError(true);
                }}
              />
            </>
          ) : resolveError ? (
            <View style={styles.noPreview}>
              <Ionicons name="document-text-outline" size={48} color={theme.colors.inkFaint} />
              <Text style={styles.noPreviewText}>{t('errors.previewFailed')}</Text>
              <Text style={styles.noPreviewSub}>
                {t('certificates.localCopyMissing')}
              </Text>
            </View>
          ) : (
            <SkeletonPreview />
          )}
        </View>
      </SafeAreaView>
    </Screen>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  safeBadgeText: { fontSize: 12, fontWeight: '700', flexShrink: 0 },
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
}
