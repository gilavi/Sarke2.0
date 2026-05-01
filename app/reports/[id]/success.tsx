import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Button } from '../../../components/ui';
import { useTheme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { useSession } from '../../../lib/session';
import { getStorageImageResizedDataUrl } from '../../../lib/imageUrl';
import { generateAndSharePdf } from '../../../lib/pdfOpen';
import { buildReportPdfHtml } from '../../../lib/reportPdf';
import { generatePdfName } from '../../../lib/pdfName';
import { friendlyError } from '../../../lib/errorMap';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { useReport, useProject } from '../../../lib/apiHooks';
import type { Report } from '../../../types/models';
import { useTranslation } from 'react-i18next';

export default function ReportSuccessScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const session = useSession();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: report } = useReport(id);
  const { data: project } = useProject(report?.project_id);
  const [sharing, setSharing] = useState(false);

  const inspectorName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    return `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || (session.state.session.user.email ?? '');
  }, [session.state]);

  const sharePdf = async () => {
    if (!report) return;
    setSharing(true);
    try {
      const slidesWithImages = report.slides.filter(s => s.image_path || s.annotated_image_path);
      const dataUrlEntries = await Promise.all(
        slidesWithImages.map(async s => {
          const path = s.annotated_image_path ?? s.image_path;
          if (!path) return [path, ''] as const;
          try {
            const url = await getStorageImageResizedDataUrl(STORAGE_BUCKETS.reportPhotos, path);
            return [path, url] as const;
          } catch {
            return [path, ''] as const;
          }
        }),
      );
      const slideImageDataUrls = Object.fromEntries(
        dataUrlEntries.filter(([, v]) => !!v),
      ) as Record<string, string>;
      const html = buildReportPdfHtml({ report, project: project ?? null, inspectorName, slideImageDataUrls });
      const pdfName = generatePdfName(
        project?.name ?? '',
        `რეპორტი_${report.title.slice(0, 10)}`,
        new Date(report.created_at),
        report.id,
      );
      await generateAndSharePdf(html, pdfName);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF გენერაცია ვერ მოხერხდა'));
    } finally {
      setSharing(false);
    }
  };

  if (!report) {
    return (
      <View style={[styles.centered, { flex: 1, backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.body, { paddingTop: insets.top + 40 }]}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={56} color={theme.colors.white} />
        </View>
        <Text style={styles.title}>რეპორტი მზადაა ✓</Text>
        <Text style={styles.subtitle}>
          {report.slides.length} სლაიდი · {report.title}
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title="PDF გაზიარება"
          onPress={sharePdf}
          loading={sharing}
        />
        <Pressable
          onPress={() => router.replace(`/reports/${report.id}` as any)}
          hitSlop={8}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.colors.accent }]}>
            რეპორტში დაბრუნება
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    centered: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, alignItems: 'center', paddingHorizontal: 24, gap: 16 },
    checkCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 12,
    },
    secondaryBtn: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryBtnText: { fontSize: 14, fontWeight: '600' },
  });
}
