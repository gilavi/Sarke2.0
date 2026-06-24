import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, Home } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SuccessScreen } from '../../../components/success';
import { Screen } from '../../../components/ui';
import { useTheme } from '../../../lib/theme';
import { SkeletonCard } from '../../../components/Skeleton';
import { useToast } from '../../../lib/toast';
import { useSession } from '../../../lib/session';
import { pdfPhotoEmbed } from '../../../lib/imageUrl';
import { slideImagePaths } from '../../../lib/reportSlides';
import { generateAndSharePdf, PdfLimitReachedError } from '../../../lib/pdfOpen';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { usePdfUsage, useInvalidatePdfUsage } from '../../../lib/usePdfUsage';
import { buildReportPdfHtml } from '../../../lib/reportPdf';
import { generatePdfName } from '../../../lib/pdfName';
import { friendlyError } from '../../../lib/errorMap';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { useReport, useProject } from '../../../lib/apiHooks';
import { ReportSlidePreview } from '../../../components/reports/ReportSlidePreview';

export default function ReportSuccessScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: report } = useReport(id);
  const { data: project } = useProject(report?.project_id);
  const [sharing, setSharing] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const slides = useMemo(
    () => (report?.slides ?? []).slice().sort((a, b) => a.order - b.order),
    [report],
  );

  const inspectorName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    return `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || (session.state.session.user.email ?? '');
  }, [session.state]);

  const sharePdf = async () => {
    if (!report) return;
    if (pdfUsage?.isLocked) { setLimitNoticeVisible(true); return; }
    setSharing(true);
    try {
      const paths = Array.from(new Set(report.slides.flatMap(slideImagePaths)));
      const dataUrlEntries = await Promise.all(
        paths.map(async path => {
          try {
            const url = await pdfPhotoEmbed(STORAGE_BUCKETS.reportPhotos, path);
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
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, userId, {
        title: report.title,
        author: inspectorName || undefined,
        documentId: report.id,
        subject: 'შრომის უსაფრთხოების რეპორტი',
      });
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setLimitNoticeVisible(true); return; }
      toast.error(friendlyError(e, t('reports.pdfGenerateFailed')));
    } finally {
      setSharing(false);
    }
  };

  if (!report) {
    return (
      <Screen edgeToEdge>
        <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  return (
    <>
      <SuccessScreen
        title={t('reports.successTitle')}
        subtitle={t('reports.successSubtitle', { count: report.slides.length, title: report.title })}
        primary={{
          title: pdfUsage?.isLocked ? t('reports.generatePdfLocked') : t('reports.generatePdf'),
          icon: FileText,
          onPress: sharePdf,
          loading: sharing,
        }}
        actions={[
          {
            icon: Home,
            title: t('tabs.backToHome'),
            subtitle: t('reports.backToHomeAction'),
            onPress: () => router.replace('/(tabs)/home' as any),
          },
        ]}
      >
        {slides.length > 0 ? (
          <View style={styles.slidesSection}>
            <Text style={styles.sectionLabel}>{t('reports.slidesSection')}</Text>
            {slides.map((s, i) => (
              <ReportSlidePreview key={s.id} slide={s} index={i} />
            ))}
          </View>
        ) : null}
      </SuccessScreen>
      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
    </>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    slidesSection: { gap: 12 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.inkFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
  });
}
