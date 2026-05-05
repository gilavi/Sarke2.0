import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { ErrorScreen } from '../../components/ErrorScreen';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { PaywallModal } from '../../components/PaywallModal';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { useBriefing, useProject } from '../../lib/apiHooks';
import { buildBriefingPreviewHtml, buildBriefingPdfHtml } from '../../lib/briefingPdf';
import { generatePdfName } from '../../lib/pdfName';
import { a11y } from '../../lib/accessibility';
import type { Briefing, Project } from '../../types/models';

export default function BriefingDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();

  const { data: briefing, isLoading: loading } = useBriefing(id);
  const { data: project } = useProject(briefing?.projectId);
  const [sharing, setSharing] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    if (briefing && project) {
      setPreviewHtml(buildBriefingPreviewHtml(briefing, project));
    }
  }, [briefing, project]);

  const sharePdf = useCallback(async () => {
    if (!briefing || !project) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setSharing(true);
    try {
      const html = buildBriefingPdfHtml(briefing, project);
      const pdfName = generatePdfName(project.company_name || project.name, 'ინსტრუქტაჟი', new Date(briefing.dateTime), briefing.id);
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, userId);
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      Alert.alert('შეცდომა', 'PDF გენერირება ვერ მოხერხდა');
    } finally {
      setSharing(false);
    }
  }, [briefing, project, pdfUsage, invalidatePdfUsage]);

  if (!id) {
    return <ErrorScreen onGoHome={() => router.replace('/(tabs)/home')} onRetry={() => router.back()} />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: true, title: 'ინსტრუქტაჟი' }} />
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'ინსტრუქტაჟის ოქმი',
          headerRight: () => (
            <Pressable
              onPress={sharePdf}
              disabled={sharing || !briefing || !project}
              style={{ paddingHorizontal: 4 }}
              hitSlop={11}
              {...a11y('PDF გაზიარება', undefined, 'button')}
            >
              {sharing ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Ionicons name="share-outline" size={22} color={theme.colors.accent} />
              )}
            </Pressable>
          ),
        }}
      />

      {/* Preview WebView */}
      {previewHtml ? (
        <View style={{ flex: 1 }}>
          {webviewLoading && Platform.OS !== 'web' && (
            <View style={styles.webviewLoader}>
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          )}
          {Platform.OS === 'web'
            ? createElement('iframe', {
                srcDoc: previewHtml,
                style: { width: '100%', height: '100%', border: 'none', display: 'block' },
              })
            : <WebView
                source={{ html: previewHtml }}
                style={{ flex: 1 }}
                onLoadEnd={() => setWebviewLoading(false)}
                scrollEnabled
                showsVerticalScrollIndicator
              />
          }
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="document-text-outline" size={48} color={theme.colors.borderStrong} />
          <Text style={{ color: theme.colors.inkFaint, fontSize: 14 }}>
            გადახედვა მიუწვდომელია
          </Text>
        </View>
      )}

      {/* Share bar */}
      <View style={[styles.shareBar, { paddingBottom: Math.max(insets.bottom, 0) + 16 }]}>
        <Pressable
          onPress={sharePdf}
          disabled={sharing || !briefing || !project}
          style={[styles.shareBtn, (sharing || !briefing || !project) && { opacity: 0.5 }]}
          {...a11y('PDF გაზიარება', 'ინსტრუქტაჟის PDF ფაილის გაზიარება', 'button')}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="share-outline" size={20} color="#fff" />
          )}
          <Text style={styles.shareBtnText}>
            {sharing ? 'PDF მზადდება...' : pdfUsage?.isLocked ? '🔒 PDF გაზიარება' : 'PDF გაზიარება'}
          </Text>
        </Pressable>
      </View>
      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
    webviewLoader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      zIndex: 1,
    },
    shareBar: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
    },
    shareBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
