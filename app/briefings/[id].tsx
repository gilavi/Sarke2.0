import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../lib/theme';
import { briefingsApi } from '../../lib/briefingsApi';
import { buildBriefingPreviewHtml, buildBriefingPdfHtml } from '../../lib/briefingPdf';
import { projectsApi } from '../../lib/services';
import { a11y } from '../../lib/accessibility';
import type { Briefing, Project } from '../../types/models';

export default function BriefingDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const b = await briefingsApi.getById(id);
      if (!b) {
        router.back();
        return;
      }
      setBriefing(b);
      const p = await projectsApi.getById(b.projectId).catch(() => null);
      setProject(p);
      if (p) {
        setPreviewHtml(buildBriefingPreviewHtml(b, p));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sharePdf = useCallback(async () => {
    if (!briefing || !project) return;
    setSharing(true);
    try {
      const html = buildBriefingPdfHtml(briefing, project);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF გენერირდა', 'გაზიარება ამ მოწყობილობაზე მიუწვდომელია');
      }
    } catch {
      Alert.alert('შეცდომა', 'PDF გენერირება ვერ მოხერხდა');
    } finally {
      setSharing(false);
    }
  }, [briefing, project]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: true, title: 'ინსტრუქტაჟი', headerBackTitle: 'პროექტი', headerTintColor: theme.colors.accent, headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.background } }} />
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
          headerBackTitle: 'პროექტი',
          headerTitleStyle: { fontSize: 17, fontWeight: '700', color: theme.colors.ink },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.accent,
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
          {webviewLoading && (
            <View style={styles.webviewLoader}>
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          )}
          <WebView
            source={{ html: previewHtml }}
            style={{ flex: 1 }}
            onLoadEnd={() => setWebviewLoading(false)}
            scrollEnabled
            showsVerticalScrollIndicator
          />
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
