// Report details — reached by tapping a saved report in a list. Renders the
// reusable DocumentDetails shell (type="report"): slide thumbnail strip, no
// signatures, no certificates. The post-save success screen is the separate
// /reports/[id]/success route — this is NOT it. Replaces the old slide-preview
// detail page.
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BarChart3 } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DocumentDetails, ReportSlidesContent } from '../../components/document-details';
import { ErrorScreen } from '../../components/ErrorScreen';
import { SkeletonPreview } from '../../components/Skeleton';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { useSession } from '../../lib/session';
import { reportDisplayName, shortCode } from '../../lib/shared/documentName';
import { friendlyError } from '../../lib/errorMap';
import { haptic } from '../../lib/haptics';
import { reopenDocument } from '../../lib/documents/reopen';
import { duplicateDocument } from '../../lib/documents/duplicate';
import { useReportDelete } from '../../features/records';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { pdfPhotoEmbed } from '../../lib/imageUrl';
import { slideImagePaths } from '../../lib/reportSlides';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { SubscriptionNotice } from '../../components/SubscriptionNotice';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { buildReportPdfHtml } from '../../lib/reportPdf';
import { generatePdfName } from '../../lib/pdfName';
import { formatShortDate } from '../../lib/formatDate';
import { useReport, useProject } from '../../lib/apiHooks';

export default function ReportDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const queryClient = useQueryClient();
  const confirmDelete = useReportDelete(() => router.back());
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reopening, setReopening] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const reportQ = useReport(id);
  const { data: report } = reportQ;
  const projectQ = useProject(report?.project_id);
  const { data: project } = projectQ;
  const [generating, setGenerating] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const expertName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    return `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || (session.state.session.user.email ?? '');
  }, [session.state]);

  const generatePdf = async () => {
    if (!report) return;
    if (pdfUsage?.isLocked) { setLimitNoticeVisible(true); return; }
    setGenerating(true);
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
      const html = buildReportPdfHtml({ report, project: project ?? null, inspectorName: expertName, slideImageDataUrls });
      const pdfName = generatePdfName(
        project?.name ?? '',
        `რეპორტი_${report.title.slice(0, 10)}`,
        new Date(report.created_at),
        report.id,
      );
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, userId, {
        title: report.title,
        author: expertName || undefined,
        documentId: report.id,
        subject: 'შრომის უსაფრთხოების რეპორტი',
      });
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setLimitNoticeVisible(true); return; }
      toast.error(friendlyError(e, t('reports.pdfGenerateFailed')));
    } finally {
      setGenerating(false);
    }
  };

  const onEdit = async () => {
    if (!report || reopening) return;
    setReopening(true);
    try {
      haptic.medium();
      await reopenDocument({ kind: 'report', id: report.id }, queryClient);
      router.replace(`/reports/${report.id}/edit` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('reports.editFailed')));
      setReopening(false);
    }
  };

  const onDuplicate = async () => {
    if (!report || duplicating) return;
    setDuplicating(true);
    try {
      haptic.medium();
      const { id: newId } = await duplicateDocument({ kind: 'report', id: report.id }, queryClient);
      toast.success(t('details.duplicate.done'));
      router.replace(`/reports/${newId}/edit` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('details.duplicate.failed')));
      setDuplicating(false);
    }
  };

  if (!id) {
    return <ErrorScreen onGoHome={() => router.replace('/(tabs)/home')} onRetry={() => router.back()} />;
  }

  if (!report) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SkeletonPreview />
      </View>
    );
  }

  const info = [
    { label: t('details.info.project'), value: project ? (project.company_name || project.name) : '—' },
    { label: t('details.info.date'), value: formatShortDate(report.created_at) },
    { label: t('details.info.expert'), value: expertName || '—' },
    { label: t('details.info.code'), value: shortCode(report.id) },
  ];

  return (
    <>
      <DocumentDetails
        type="report"
        tileIcon={BarChart3}
        title={reportDisplayName(report.title)}
        typeLabel={t('details.type.report')}
        status={null}
        info={info}
        contentLabel={t('details.content.report')}
        contentTab={t('details.content.report')}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={() => confirmDelete(report)}
        editing={reopening}
        duplicating={duplicating}
        onSharePdf={generatePdf}
        sharing={generating}
        pdfLocked={pdfUsage?.isLocked}
        onBack={() => router.back()}
      >
        <ReportSlidesContent
          slides={report.slides}
          onOpenSlide={(slideId) => router.push(`/reports/${report.id}/slide/${slideId}` as any)}
        />
      </DocumentDetails>
      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
    </>
  );
}
