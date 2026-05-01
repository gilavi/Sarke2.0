import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../lib/theme';
import { generateAndSharePdf } from '../../lib/pdfOpen';
import { useBriefing, useProject } from '../../lib/apiHooks';
import { buildBriefingPreviewHtml, buildBriefingPdfHtml } from '../../lib/briefingPdf';
import { generatePdfName } from '../../lib/pdfName';
import { a11y } from '../../lib/accessibility';
import type { Briefing, Project } from '../../types/models';

export default function BriefingDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: briefing, isLoading: loading } = useBriefing(id);
  const { data: project } = useProject(briefing?.projectId);
  const [sharing, setSharing] = useState(false);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    if (briefing && project) {
      setPreviewHtml(buildBriefingPreviewHtml(briefing, project));
    }
  }, [briefing, project]);

  const sharePdf = useCallback(async () => {
    if (!briefing || !project) return;
    setSharing(true);
    try {
      const html = buildBriefingPdfHtml(briefing, project);
      const pdfName = generatePdfName(project.name, 'ინსტრუქტაჟი', new Date(briefing.dateTime), briefing.id);
      await generateAndSharePdf(html, pdfName);
    } catch {
      Alert.alert('შეცდომა', 'PDF გენერირება ვერ მოხერხდა');
    } finally {
      setSharing(false);
    }
  }, [briefing, project]);

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
      <View style={styles.shareBar}>
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
            {sharing ? 'PDF მზადდება...' : 'PDF გაზიარება'}
          </Text>
        </Pressable>
      </View>
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
