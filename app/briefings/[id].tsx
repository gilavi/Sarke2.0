// Instruction (briefing) details — reached by tapping a saved briefing in a
// list. Renders DocumentDetails (type="instruction"): topic note, VIEW-ONLY
// signatures (the expert + participants signed during the flow), no
// certificates. The post-save success screen is /briefings/[id]/done — this is
// NOT it. Replaces the old WebView PDF-preview detail page.
import { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { DocumentDetails, NoteBlocksContent } from '../../components/document-details';
import { ErrorScreen } from '../../components/ErrorScreen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonCard } from '../../components/Skeleton';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { useSession } from '../../lib/session';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { SubscriptionNotice } from '../../components/SubscriptionNotice';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { useBriefing, useProject, invalidateRecordLists } from '../../lib/apiHooks';
import { queryClient } from '../../lib/queryClient';
import { briefingsApi } from '../../lib/briefingsApi';
import { reopenDocument } from '../../lib/documents/reopen';
import { duplicateDocument } from '../../lib/documents/duplicate';
import { haptic } from '../../lib/haptics';
import { friendlyError } from '../../lib/errorMap';
import { buildBriefingPdfHtml } from '../../lib/briefingPdf';
import { generatePdfName } from '../../lib/pdfName';
import { formatShortDate } from '../../lib/formatDate';
import { shortCode } from '../../lib/shared/documentName';
import { briefingTopicLabel, briefingTopicsLabel } from '../../features/records/topics';

export default function BriefingDetailScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const toast = useToast();

  const { data: briefing, isLoading: loading } = useBriefing(id);
  const { data: project } = useProject(briefing?.projectId);
  const [sharing, setSharing] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();
  const [reopening, setReopening] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // People who signed during the flow — expert first, then participants.
  const participants = useMemo(() => {
    if (!briefing) return [];
    return [
      { name: briefing.inspectorName, signed: !!briefing.inspectorSignature },
      ...briefing.participants.map((p) => ({ name: p.name, signed: !!p.signature })),
    ];
  }, [briefing]);

  const onEdit = useCallback(async () => {
    if (!briefing || reopening) return;
    setReopening(true);
    try {
      haptic.medium();
      await reopenDocument({ kind: 'briefing', id: briefing.id }, queryClient);
      router.replace(`/briefings/new?editId=${briefing.id}&projectId=${briefing.projectId}` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('briefings.createFailed')));
      setReopening(false);
    }
  }, [briefing, reopening, router, toast, t]);

  const onDuplicate = useCallback(async () => {
    if (!briefing || duplicating) return;
    setDuplicating(true);
    try {
      haptic.medium();
      const { id: newId } = await duplicateDocument({ kind: 'briefing', id: briefing.id }, queryClient);
      toast.success(t('details.duplicate.done'));
      router.replace(`/briefings/new?editId=${newId}&projectId=${briefing.projectId}` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('details.duplicate.failed')));
      setDuplicating(false);
    }
  }, [briefing, duplicating, router, toast, t]);

  const onDelete = useCallback(() => {
    if (!briefing) return;
    Alert.alert(t('details.delete.title'), t('details.delete.confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await briefingsApi.remove(briefing.id);
            invalidateRecordLists(queryClient);
            toast.success(t('notifications.deleted'));
            router.back();
          } catch (e) {
            toast.error(friendlyError(e, t('errors.deleteFailed')));
          }
        },
      },
    ]);
  }, [briefing, router, toast, t]);

  const sharePdf = useCallback(async () => {
    if (!briefing || !project) return;
    if (pdfUsage?.isLocked) { setLimitNoticeVisible(true); return; }
    setSharing(true);
    try {
      const html = buildBriefingPdfHtml(briefing, project);
      const pdfName = generatePdfName(project.company_name || project.name, 'ინსტრუქტაჟი', new Date(briefing.dateTime), briefing.id);
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, userId, {
        title: 'ინსტრუქტაჟი',
        author: briefing.inspectorName || undefined,
        documentId: briefing.id,
        subject: 'შრომის უსაფრთხოების ინსტრუქტაჟი',
      });
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setLimitNoticeVisible(true); return; }
      toast.error(friendlyError(e, t('briefings.pdfGenerateFailed')));
    } finally {
      setSharing(false);
    }
  }, [briefing, project, pdfUsage, invalidatePdfUsage, session.state, toast, t]);

  if (!id) {
    return <ErrorScreen onGoHome={() => router.replace('/(tabs)/home')} onRetry={() => router.back()} />;
  }

  if (loading || !briefing) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScreenHeader title={t('briefings.flowTitle')} />
        <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
          <SkeletonCard />
        </View>
      </View>
    );
  }

  const info = [
    { label: t('details.info.project'), value: project ? (project.company_name || project.name) : '—' },
    { label: t('details.info.date'), value: formatShortDate(briefing.dateTime) },
    { label: t('details.info.expert'), value: briefing.inspectorName || '—' },
    { label: t('details.info.code'), value: shortCode(briefing.id) },
  ];

  const topicLines = briefing.topics.map((tp) => briefingTopicLabel(tp, t)).join('\n');

  return (
    <>
      <DocumentDetails
        type="instruction"
        tileIcon={Users}
        title={briefingTopicsLabel(briefing.topics, t)}
        typeLabel={t('details.type.instruction')}
        status={null}
        info={info}
        contentLabel={t('details.content.instruction')}
        contentTab={t('details.content.instruction')}
        signatures={{ mode: 'view', participants }}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        editing={reopening}
        duplicating={duplicating}
        onSharePdf={sharePdf}
        sharing={sharing}
        pdfLocked={pdfUsage?.isLocked}
        onBack={() => router.back()}
      >
        <NoteBlocksContent blocks={[{ text: topicLines }]} />
      </DocumentDetails>
      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
    </>
  );
}
