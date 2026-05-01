import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button } from '../../components/ui';
import { HeaderBackPill } from '../../components/HeaderBackPill';
import { useBottomSheet } from '../../components/BottomSheet';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { useSession } from '../../lib/session';
import { friendlyError } from '../../lib/errorMap';
import { reportsApi } from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { getStorageImageResizedDataUrl, getStorageImageDisplayUrl } from '../../lib/imageUrl';
import { generateAndSharePdf } from '../../lib/pdfOpen';
import { buildReportPdfHtml } from '../../lib/reportPdf';
import { generatePdfName } from '../../lib/pdfName';
import { formatShortDateTime } from '../../lib/formatDate';
import { useReport, useProject } from '../../lib/apiHooks';
import type { Report, ReportSlide } from '../../types/models';

export default function ReportDetailScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const session = useSession();
  const showSheet = useBottomSheet();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: report } = useReport(id);
  const { data: project } = useProject(report?.project_id);
  const [generating, setGenerating] = useState(false);

  const slides = useMemo(
    () => (report?.slides ?? []).slice().sort((a, b) => a.order - b.order),
    [report],
  );

  const inspectorName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    return `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || (session.state.session.user.email ?? '');
  }, [session.state]);

  const generatePdf = async () => {
    if (!report) return;
    setGenerating(true);
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
      setGenerating(false);
    }
  };

  const onDelete = () => {
    if (!report) return;
    showSheet(
      {
        title: 'რეპორტის წაშლა?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      async idx => {
        if (idx !== 0) return;
        try {
          await reportsApi.remove(report.id);
          toast.success('წაიშალა');
          router.back();
        } catch (e) {
          toast.error(friendlyError(e, 'წაშლა ვერ მოხერხდა'));
        }
      },
    );
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
      <Stack.Screen
        options={{
          title: 'რეპორტი',
          headerBackVisible: false,
          headerLeft: () => <HeaderBackPill onPress={() => router.back()} />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.accent,
          headerTitleStyle: { color: theme.colors.ink, fontWeight: '700', fontSize: 17 },
          headerRight: () => (
            <Pressable onPress={onDelete} hitSlop={8} style={{ marginRight: 8 }}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 12 }}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{report.title}</Text>
          <Text style={styles.heroMeta}>
            {project?.name ? `${project.name} · ` : ''}
            {report.slides.length} სლაიდი · {formatShortDateTime(report.created_at)}
          </Text>
          <View style={styles.statusChip}>
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.semantic.success} />
            <Text style={[styles.statusText, { color: theme.colors.semantic.success }]}>
              დასრულებული
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>სლაიდები</Text>
        {slides.map((s, i) => (
          <SlideRow key={s.id} slide={s} index={i} theme={theme} styles={styles} />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button title="PDF გენერირება" onPress={generatePdf} loading={generating} />
      </View>
    </View>
  );
}

function SlideRow({
  slide,
  index,
  theme,
  styles,
}: {
  slide: ReportSlide;
  index: number;
  theme: any;
  styles: any;
}) {
  const path = slide.annotated_image_path ?? slide.image_path;
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUri(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await getStorageImageDisplayUrl(STORAGE_BUCKETS.reportPhotos, path);
        if (!cancelled) setUri(u);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <View style={styles.slideRow}>
      <View style={styles.slideHeader}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberBadgeText}>{index + 1}</Text>
        </View>
        <Text style={styles.slideTitle} numberOfLines={1}>
          {slide.title || `სლაიდი ${index + 1}`}
        </Text>
      </View>
      {uri ? (
        <View style={styles.slideImageWrap}>
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      ) : null}
      {slide.description ? (
        <Text style={styles.slideDescription}>{slide.description}</Text>
      ) : null}
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    centered: { alignItems: 'center', justifyContent: 'center' },
    heroCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      gap: 6,
    },
    heroTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.ink },
    heroMeta: { fontSize: 12, color: theme.colors.inkSoft },
    statusChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.semantic.successSoft,
      marginTop: 6,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.inkFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginTop: 8,
    },
    slideRow: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    slideHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    numberBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberBadgeText: { color: theme.colors.white, fontSize: 11, fontWeight: '700' },
    slideTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.ink },
    slideImageWrap: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.subtleSurface,
    },
    slideDescription: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      lineHeight: 18,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
  });
}
